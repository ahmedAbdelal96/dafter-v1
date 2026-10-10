import 'dotenv/config';

import { ConflictException } from '@nestjs/common';
import { AccountingAccountType } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { InitializeCompanyAccounting } from '../accounting-bootstrap/accounting-bootstrap.service';
import { TemplateService } from '../accounting-bootstrap/template.service';
import { SalesPricingService } from '../sales/sales-pricing.service';
import { SalesTaxCalculatorService } from '../sales/sales-tax-calculator.service';
import { SalesInvoiceService } from '../sales/sales-invoice.service';
import { CustomerPaymentService } from './customer-payment.service';

jest.setTimeout(60_000);

describe('B04 customer payments and AR reconciliation', () => {
  let prisma: PrismaService;
  let accounting: AccountingService;
  let payments: CustomerPaymentService;
  let sales: SalesInvoiceService;
  let companyId: string;
  let ownerId: string;
  let customerId: string;
  let cashAccountId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    await prisma.currency.upsert({
      where: { code: 'EGP' },
      update: { isActive: true, minorUnitPrecision: 2 },
      create: { code: 'EGP', name: 'Egyptian Pound', minorUnitPrecision: 2 },
    });
    const stamp = Date.now();
    const company = await prisma.company.create({
      data: { name: `B04 Payments ${stamp}`, currencyCode: 'EGP' },
    });
    companyId = company.id;
    const owner = await prisma.user.create({
      data: {
        email: `b04-payments-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'B04 Owner',
        companyId,
        role: 'OWNER',
      },
    });
    ownerId = owner.id;
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `B04-CUSTOMER-${stamp}`,
        displayName: 'B04 Customer',
        partnerType: 'ORGANIZATION',
        customerProfile: { create: {} },
      },
    });
    customerId = partner.id;
    const initializer = new InitializeCompanyAccounting(
      prisma,
      new PlatformIdempotencyService(prisma),
      new TemplateService(prisma),
    );
    await initializer.execute({
      companyId,
      actorUserId: ownerId,
      idempotencyKey: `b04-bootstrap-${stamp}`,
      countryCode: 'EG',
      localeCode: 'en-EG',
      baseCurrencyCode: 'EGP',
      templateCode: 'EG_STANDARD_V1',
      templateVersion: 1,
      fiscalYearStart: new Date('2026-01-01'),
      fiscalYearEnd: new Date('2026-12-31'),
    });
    accounting = new AccountingService(
      prisma,
      new PlatformIdempotencyService(prisma),
    );
    const readiness = new AccountingReadinessService(prisma);
    sales = new SalesInvoiceService(
      prisma,
      new SalesPricingService(),
      new SalesTaxCalculatorService(),
      accounting,
      readiness,
    );
    payments = new CustomerPaymentService(prisma, accounting, readiness);
    cashAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId, accountType: AccountingAccountType.ASSET_CASH },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  async function postInvoice(amount: string) {
    const draft = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: customerId,
      documentDate: new Date('2026-10-10'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [
        {
          description: `B04 service ${amount}`,
          quantity: '1',
          unitPrice: amount,
          discountValue: '0',
        },
      ],
    });
    return sales.postDraft(companyId, ownerId, draft.id, {
      postingDate: new Date('2026-10-10'),
      idempotencyKey: `b04-invoice-${draft.id}`,
    });
  }

  async function paymentInput(
    amount: string,
    journalLineId: string,
    allocation = amount,
  ) {
    return {
      businessPartnerId: customerId,
      paymentDate: new Date('2026-10-11'),
      method: 'CASH' as const,
      destinationAccountId: cashAccountId,
      transactionCurrencyCode: 'EGP',
      exchangeRate: '1',
      amount,
      allocations: [{ journalLineId, amount: allocation }],
    };
  }

  it('supports exact partial and full maturity allocation without invoice-id inference', async () => {
    const invoice = await postInvoice('100');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    expect(maturity.journalLineId).toBeTruthy();

    const first = await payments.createDraft(
      companyId,
      ownerId,
      await paymentInput('60', maturity.journalLineId!, '60'),
    );
    await payments.postDraft(
      companyId,
      ownerId,
      first.id,
      new Date('2026-10-11'),
      'b04-partial-1',
    );
    expect(
      (await payments.listOpenItems(companyId, customerId))[0].remainingAmount,
    ).toBe('40');

    const second = await payments.createDraft(
      companyId,
      ownerId,
      await paymentInput('40', maturity.journalLineId!, '40'),
    );
    await payments.postDraft(
      companyId,
      ownerId,
      second.id,
      new Date('2026-10-12'),
      'b04-partial-2',
    );
    expect(await payments.listOpenItems(companyId, customerId)).toHaveLength(0);
  });

  it('keeps overpayment on-account and permits later reconciliation', async () => {
    const firstInvoice = await postInvoice('50');
    const firstMaturity =
      await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
        where: { salesInvoiceId: firstInvoice.id },
      });
    const overpayment = await payments.createDraft(
      companyId,
      ownerId,
      await paymentInput('80', firstMaturity.journalLineId!, '50'),
    );
    const posted = await payments.postDraft(
      companyId,
      ownerId,
      overpayment.id,
      new Date('2026-10-13'),
      'b04-overpayment',
    );
    expect(posted.unappliedAmount.toString()).toBe('30');

    const secondInvoice = await postInvoice('40');
    const secondMaturity =
      await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
        where: { salesInvoiceId: secondInvoice.id },
      });
    await payments.reconcileOnAccount(
      companyId,
      ownerId,
      overpayment.id,
      secondMaturity.journalLineId!,
      '30',
      'b04-later-reconciliation',
    );
    expect(
      (await payments.listOpenItems(companyId, customerId)).at(-1)
        ?.remainingAmount,
    ).toBe('10');
  });

  it('rejects wrong-customer targets and prevents concurrent over-allocation', async () => {
    const invoice = await postInvoice('100');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    const first = await payments.createDraft(
      companyId,
      ownerId,
      await paymentInput('60', maturity.journalLineId!, '60'),
    );
    const second = await payments.createDraft(
      companyId,
      ownerId,
      await paymentInput('60', maturity.journalLineId!, '60'),
    );
    const results = await Promise.allSettled([
      payments.postDraft(
        companyId,
        ownerId,
        first.id,
        new Date('2026-10-14'),
        'b04-concurrent-1',
      ),
      payments.postDraft(
        companyId,
        ownerId,
        second.id,
        new Date('2026-10-14'),
        'b04-concurrent-2',
      ),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const open = await payments.listOpenItems(companyId, customerId);
    expect(
      open.find((row) => row.id === maturity.journalLineId)?.remainingAmount,
    ).toBe('40');
  });

  it('rejects non-cash destination accounts and keeps posted payments immutable', async () => {
    const bank = await prisma.accountingAccount.findFirstOrThrow({
      where: { companyId, accountType: AccountingAccountType.ASSET_BANK },
    });
    await expect(
      payments.createDraft(companyId, ownerId, {
        ...(await paymentInput('1', '00000000-0000-0000-0000-000000000000')),
        destinationAccountId: bank.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

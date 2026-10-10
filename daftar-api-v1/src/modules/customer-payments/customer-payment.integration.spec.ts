import 'dotenv/config';

import { ConflictException } from '@nestjs/common';
import {
  ARReconciliationStatus,
  AccountingAccountType,
  CustomerPaymentStatus,
  JournalEntryStatus,
  JournalSourceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { InitializeCompanyAccounting } from '../accounting-bootstrap/accounting-bootstrap.service';
import { TemplateService } from '../accounting-bootstrap/template.service';
import { SalesPricingService } from '../sales/sales-pricing.service';
import { SalesTaxCalculatorService } from '../sales/sales-tax-calculator.service';
import { SalesInvoiceService } from '../sales/sales-invoice.service';
import { SalesCreditNoteService } from '../sales/sales-credit-note.service';
import { ARReconciliationService } from './ar-reconciliation.service';
import { CustomerPaymentService } from './customer-payment.service';

jest.setTimeout(60_000);

describe('B04 customer payments and AR reconciliation', () => {
  let prisma: PrismaService;
  let accounting: AccountingService;
  let payments: CustomerPaymentService;
  let sales: SalesInvoiceService;
  let creditNotes: SalesCreditNoteService;
  let ar: ARReconciliationService;
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
    ar = new ARReconciliationService(prisma, accounting, readiness);
    sales = new SalesInvoiceService(
      prisma,
      new SalesPricingService(),
      new SalesTaxCalculatorService(),
      accounting,
      readiness,
    );
    creditNotes = new SalesCreditNoteService(
      prisma,
      new SalesTaxCalculatorService(),
      accounting,
      readiness,
    );
    payments = new CustomerPaymentService(prisma, accounting, readiness, ar);
    cashAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId, accountType: AccountingAccountType.ASSET_CASH },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  async function postInvoice(
    amount: string,
    currencyCode = 'EGP',
    exchangeRate = '1',
  ) {
    const draft = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: customerId,
      documentDate: new Date('2026-10-10'),
      currencyCode,
      exchangeRate,
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

  function paymentInput(
    amount: string,
    journalLineId: string,
    allocation = amount,
    currencyCode = 'EGP',
    exchangeRate = '1',
  ) {
    return {
      businessPartnerId: customerId,
      paymentDate: new Date('2026-10-11'),
      method: 'CASH' as const,
      destinationAccountId: cashAccountId,
      transactionCurrencyCode: currencyCode,
      exchangeRate,
      amount,
      allocations: [{ journalLineId, amount: allocation }],
    };
  }

  async function configureCashCurrency(currencyCode: 'EGP' | 'USD') {
    await prisma.currency.upsert({
      where: { code: currencyCode },
      update: { isActive: true, minorUnitPrecision: 2 },
      create: {
        code: currencyCode,
        name: currencyCode === 'USD' ? 'US Dollar' : 'Egyptian Pound',
        minorUnitPrecision: 2,
      },
    });
    const cashJournal = await prisma.accountingJournal.create({
      data: {
        companyId,
        code: `${currencyCode}-CASH-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: `${currencyCode} Cash`,
        type: 'CASH',
        currencyCode,
      },
    });
    const configuration =
      await prisma.accountingConfiguration.findUniqueOrThrow({
        where: { companyId },
      });
    const cashMapping =
      await prisma.accountingConfigurationJournal.findFirstOrThrow({
        where: {
          companyId,
          configurationId: configuration.id,
          settingKey: 'CASH',
        },
      });
    await prisma.accountingConfigurationJournal.update({
      where: { id: cashMapping.id },
      data: { journalId: cashJournal.id },
    });
  }

  async function configureUsdCash() {
    await configureCashCurrency('USD');
  }

  async function arLineForEntry(journalEntryId: string, credit = false) {
    return prisma.journalLine.findFirstOrThrow({
      where: {
        journalEntryId,
        businessPartnerId: customerId,
        account: {
          accountType: AccountingAccountType.ASSET_RECEIVABLE,
        },
        ...(credit
          ? { transactionCredit: { gt: 0 } }
          : { transactionDebit: { gt: 0 } }),
      },
    });
  }

  async function assertNoTechnicalOpenItems() {
    const open = await ar.listOpenItems(companyId, customerId);
    expect(
      open.some(
        (row) =>
          row.sourceType === JournalSourceType.AR_RECONCILIATION ||
          row.sourceType === JournalSourceType.REVERSAL,
      ),
    ).toBe(false);
    return open;
  }

  beforeEach(async () => {
    await configureCashCurrency('EGP');
  });

  it('supports exact partial and full maturity allocation without invoice-id inference', async () => {
    const invoice = await postInvoice('100');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    expect(maturity.journalLineId).toBeTruthy();

    const first = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('60', maturity.journalLineId!, '60'),
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
      paymentInput('40', maturity.journalLineId!, '40'),
    );
    await payments.postDraft(
      companyId,
      ownerId,
      second.id,
      new Date('2026-10-12'),
      'b04-partial-2',
    );
    expect(
      (await payments.listOpenItems(companyId, customerId)).find(
        (row) => row.id === maturity.journalLineId,
      ),
    ).toBeUndefined();
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
      paymentInput('80', firstMaturity.journalLineId!, '50'),
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
      paymentInput('60', maturity.journalLineId!, '60'),
    );
    const second = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('60', maturity.journalLineId!, '60'),
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
        ...paymentInput('1', '00000000-0000-0000-0000-000000000000'),
        destinationAccountId: bank.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reopens the invoice and reverses active reconciliations when a payment is reversed', async () => {
    const invoice = await postInvoice('70');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    const payment = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('70', maturity.journalLineId!),
    );
    await payments.postDraft(
      companyId,
      ownerId,
      payment.id,
      new Date('2026-10-15'),
      'b041-reversal-post',
    );
    expect(
      (await payments.listOpenItems(companyId, customerId)).find(
        (row) => row.id === maturity.journalLineId,
      ),
    ).toBeUndefined();

    const reversed = await payments.reverse(
      companyId,
      ownerId,
      payment.id,
      new Date('2026-10-16'),
      'Customer requested reversal',
      'b041-reversal-request',
    );
    expect(reversed.status).toBe(CustomerPaymentStatus.REVERSED);
    const reconciliation = await prisma.aRReconciliation.findFirstOrThrow({
      where: { customerPaymentId: payment.id },
    });
    expect(reconciliation.status).toBe(ARReconciliationStatus.REVERSED);
    expect(
      (await payments.listOpenItems(companyId, customerId)).find(
        (row) => row.id === maturity.journalLineId,
      )?.remainingAmount,
    ).toBe('70');

    const replay = await payments.reverse(
      companyId,
      ownerId,
      payment.id,
      new Date('2026-10-16'),
      'Customer requested reversal',
      'b041-reversal-request',
    );
    expect(replay.id).toBe(payment.id);
    await expect(
      payments.reverse(
        companyId,
        ownerId,
        payment.id,
        new Date('2026-10-16'),
        'Changed reason',
        'b041-reversal-request',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const original = await prisma.journalEntry.findUniqueOrThrow({
      where: { id: reversed.journalEntryId! },
    });
    const reversal = await prisma.journalEntry.findUniqueOrThrow({
      where: { id: reversed.reversalJournalEntryId! },
    });
    expect(original.status).toBe(JournalEntryStatus.REVERSED);
    expect(reversal.status).toBe(JournalEntryStatus.POSTED);
  });

  it('carries base amounts and posts a realized FX loss for a changed settlement rate', async () => {
    await configureUsdCash();
    const invoice = await postInvoice('100', 'USD', '2');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    const payment = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('100', maturity.journalLineId!, '100', 'USD', '1.9'),
    );
    const postedPayment = await payments.postDraft(
      companyId,
      ownerId,
      payment.id,
      new Date('2026-10-17'),
      'b041-fx-post',
    );
    const reconciliation = await prisma.aRReconciliation.findFirstOrThrow({
      where: { customerPaymentId: payment.id },
    });
    expect(reconciliation.debitBaseAmountApplied.toString()).toBe('200');
    expect(reconciliation.creditBaseAmountApplied.toString()).toBe('190');
    expect(reconciliation.realizedFxAmount.toString()).toBe('-10');
    expect(reconciliation.adjustmentJournalEntryId).toBeTruthy();

    const adjustment = await prisma.journalEntry.findUniqueOrThrow({
      where: { id: reconciliation.adjustmentJournalEntryId! },
      include: { lines: true },
    });
    expect(
      adjustment.lines.reduce(
        (sum, line) => sum + Number(line.debit) - Number(line.credit),
        0,
      ),
    ).toBe(0);
    const open = await assertNoTechnicalOpenItems();
    expect(
      open.find((row) => row.id === maturity.journalLineId),
    ).toBeUndefined();
    expect(
      open.find((row) => row.id === postedPayment.arJournalLineId),
    ).toBeUndefined();

    const technicalDebit = adjustment.lines.find(
      (line) =>
        line.businessPartnerId === customerId && line.transactionDebit.gt(0),
    );
    const paymentCredit = await arLineForEntry(
      postedPayment.journalEntryId!,
      true,
    );
    expect(technicalDebit).toBeTruthy();
    await expect(
      prisma.aRReconciliation.create({
        data: {
          companyId,
          debitJournalLineId: technicalDebit!.id,
          creditJournalLineId: paymentCredit.id,
          transactionAmount: '1',
          debitBaseAmountApplied: '1',
          creditBaseAmountApplied: '1',
          realizedFxAmount: '0',
          idempotencyKey: `b042-trigger-${Date.now()}`,
          requestHash: '0'.repeat(64),
          createdById: ownerId,
        },
      }),
    ).rejects.toThrow(
      'AR reconciliation lines are not valid authoritative AR control lines',
    );
  });

  it('settles foreign currency gain and keeps deterministic partial residuals', async () => {
    await configureUsdCash();
    const invoice = await postInvoice('100', 'USD', '2');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    const first = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('40', maturity.journalLineId!, '40', 'USD', '1.9'),
    );
    const postedFirst = await payments.postDraft(
      companyId,
      ownerId,
      first.id,
      new Date('2026-10-18'),
      'b042-fx-partial-1',
    );
    const afterFirst = await ar.listOpenItems(companyId, customerId);
    expect(
      afterFirst.find((row) => row.id === maturity.journalLineId),
    ).toMatchObject({
      remainingTransactionAmount: '60',
      remainingBaseAmount: '120',
    });
    const second = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('60', maturity.journalLineId!, '60', 'USD', '2.1'),
    );
    await payments.postDraft(
      companyId,
      ownerId,
      second.id,
      new Date('2026-10-19'),
      'b042-fx-partial-2',
    );
    expect(
      (await ar.listOpenItems(companyId, customerId)).find(
        (row) => row.id === maturity.journalLineId,
      ),
    ).toBeUndefined();
    await assertNoTechnicalOpenItems();
    const lines = await prisma.journalLine.findMany({
      where: {
        journalEntry: { sourceId: { in: [postedFirst.id, second.id] } },
      },
      include: { journalEntry: true },
    });
    expect(
      lines.filter((line) => line.accountId === maturity.journalLineId),
    ).toHaveLength(0);
  });

  it('supports explicit credit-note reconciliation without FIFO and supports AR account reclassification', async () => {
    const invoiceA = await postInvoice('100');
    const invoiceB = await postInvoice('100');
    const note = await creditNotes.createDraft(companyId, ownerId, {
      salesInvoiceId: invoiceB.id,
      documentDate: new Date('2026-10-20'),
      reason: 'B042 explicit credit note',
      lines: [
        { originalSalesInvoiceLineId: invoiceB.lines[0].id, quantity: '0.5' },
      ],
    });
    const postedNote = await creditNotes.postDraft(
      companyId,
      ownerId,
      note.id,
      {
        postingDate: new Date('2026-10-20'),
        idempotencyKey: `b042-credit-note-${note.id}`,
      },
    );
    const debitA = (
      await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
        where: { salesInvoiceId: invoiceA.id },
      })
    ).journalLineId!;
    const debitB = (
      await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
        where: { salesInvoiceId: invoiceB.id },
      })
    ).journalLineId!;
    const creditNoteLine = await arLineForEntry(
      postedNote.journalEntryId!,
      true,
    );
    expect(
      (await ar.listOpenItems(companyId, customerId))
        .filter((row) => [debitA, debitB, creditNoteLine.id].includes(row.id))
        .map((row) => [row.id, row.remainingAmount]),
    ).toEqual(
      expect.arrayContaining([
        [debitA, '100'],
        [debitB, '100'],
        [creditNoteLine.id, '50'],
      ]),
    );
    await ar.reconcile({
      companyId,
      actorUserId: ownerId,
      debitJournalLineId: debitB,
      creditJournalLineId: creditNoteLine.id,
      transactionAmount: '50',
      postingDate: new Date('2026-10-21'),
      idempotencyKey: 'b042-explicit-credit-note',
    });
    const after = await ar.listOpenItems(companyId, customerId);
    expect(after.find((row) => row.id === debitA)?.remainingAmount).toBe('100');
    expect(after.find((row) => row.id === debitB)?.remainingAmount).toBe('50');
    expect(after.find((row) => row.id === creditNoteLine.id)).toBeUndefined();

    await prisma.customerProfile.update({
      where: { businessPartnerId: customerId },
      data: { receivableAccountId: null },
    });
    const accountA = (
      await prisma.salesInvoice.findUniqueOrThrow({
        where: { id: invoiceA.id },
      })
    ).receivableAccountId!;
    const accountB = await prisma.accountingAccount.create({
      data: {
        companyId,
        code: `AR-ALT-${Date.now()}`,
        name: 'Alternative AR',
        accountType: AccountingAccountType.ASSET_RECEIVABLE,
        allowDirectPosting: true,
        isControlAccount: true,
        reconciliationEligible: true,
      },
    });
    const reclassInvoice = await postInvoice('25');
    await prisma.customerProfile.update({
      where: { businessPartnerId: customerId },
      data: { receivableAccountId: accountB.id },
    });
    const reclassMaturity =
      await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
        where: { salesInvoiceId: reclassInvoice.id },
      });
    const reclassPayment = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('25', reclassMaturity.journalLineId!),
    );
    await payments.postDraft(
      companyId,
      ownerId,
      reclassPayment.id,
      new Date('2026-10-22'),
      'b042-ar-reclass',
    );
    const reclass = await prisma.aRReconciliation.findFirstOrThrow({
      where: { customerPaymentId: reclassPayment.id },
    });
    expect(reclass.adjustmentJournalEntryId).toBeTruthy();
    const reclassLines = await prisma.journalLine.findMany({
      where: { journalEntryId: reclass.adjustmentJournalEntryId! },
    });
    expect(reclassLines.map((line) => line.accountId)).toEqual(
      expect.arrayContaining([accountA, accountB.id]),
    );
    expect(
      (await ar.listOpenItems(companyId, customerId)).some(
        (row) => row.sourceType === JournalSourceType.AR_RECONCILIATION,
      ),
    ).toBe(false);
    await prisma.customerProfile.update({
      where: { businessPartnerId: customerId },
      data: { receivableAccountId: null },
    });
  });

  it('is idempotent, rejects changed idempotent payloads, and serializes competing reconciliations', async () => {
    const invoice = await postInvoice('100');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    const payment = await payments.createDraft(companyId, ownerId, {
      ...paymentInput('100', maturity.journalLineId!),
      allocations: [],
    });
    const postedPayment = await payments.postDraft(
      companyId,
      ownerId,
      payment.id,
      new Date('2026-10-23'),
      'b042-on-account',
    );
    const credit = await arLineForEntry(postedPayment.journalEntryId!, true);
    const input = {
      companyId,
      actorUserId: ownerId,
      debitJournalLineId: maturity.journalLineId!,
      creditJournalLineId: credit.id,
      transactionAmount: '40',
      postingDate: new Date('2026-10-24'),
      idempotencyKey: 'b042-idempotency',
    };
    const first = await ar.reconcile(input);
    expect((await ar.reconcile(input)).id).toBe(first.id);
    await expect(
      ar.reconcile({ ...input, transactionAmount: '41' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      ar.reconcile({ ...input, postingDate: new Date('2026-10-25') }),
    ).rejects.toBeInstanceOf(ConflictException);

    const competingInvoice = await postInvoice('100');
    const competingDebit = (
      await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
        where: { salesInvoiceId: competingInvoice.id },
      })
    ).journalLineId!;
    const competingPayment = await payments.createDraft(companyId, ownerId, {
      ...paymentInput('100', competingDebit),
      allocations: [],
    });
    const postedCompetingPayment = await payments.postDraft(
      companyId,
      ownerId,
      competingPayment.id,
      new Date('2026-10-26'),
      'b042-concurrent-credit',
    );
    const competingCredit = await arLineForEntry(
      postedCompetingPayment.journalEntryId!,
      true,
    );
    const results = await Promise.allSettled([
      ar.reconcile({
        ...input,
        debitJournalLineId: competingDebit,
        creditJournalLineId: competingCredit.id,
        transactionAmount: '60',
        idempotencyKey: 'b042-race-a',
      }),
      ar.reconcile({
        ...input,
        debitJournalLineId: competingDebit,
        creditJournalLineId: competingCredit.id,
        transactionAmount: '60',
        idempotencyKey: 'b042-race-b',
      }),
    ]);
    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await ar.listOpenItems(companyId, customerId)).find(
        (row) => row.id === competingDebit,
      )?.remainingAmount,
    ).toBe('40');

    const raceInvoice = await postInvoice('100');
    const raceDebit = (
      await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
        where: { salesInvoiceId: raceInvoice.id },
      })
    ).journalLineId!;
    const racePayment = await payments.createDraft(companyId, ownerId, {
      ...paymentInput('60', raceDebit),
      allocations: [],
    });
    const postedRacePayment = await payments.postDraft(
      companyId,
      ownerId,
      racePayment.id,
      new Date('2026-10-31'),
      'b042-payment-v-credit-note-payment',
    );
    const raceCreditFromPayment = await arLineForEntry(
      postedRacePayment.journalEntryId!,
      true,
    );
    const raceSourceInvoice = await postInvoice('60');
    const raceNote = await creditNotes.createDraft(companyId, ownerId, {
      salesInvoiceId: raceSourceInvoice.id,
      documentDate: new Date('2026-11-01'),
      reason: 'B042 race source credit note',
      lines: [
        {
          originalSalesInvoiceLineId: raceSourceInvoice.lines[0].id,
          quantity: '1',
        },
      ],
    });
    const postedRaceNote = await creditNotes.postDraft(
      companyId,
      ownerId,
      raceNote.id,
      {
        postingDate: new Date('2026-11-01'),
        idempotencyKey: `b042-payment-v-credit-note-note-${raceNote.id}`,
      },
    );
    const raceCreditFromNote = await arLineForEntry(
      postedRaceNote.journalEntryId!,
      true,
    );
    const raceResults = await Promise.allSettled([
      ar.reconcile({
        ...input,
        debitJournalLineId: raceDebit,
        creditJournalLineId: raceCreditFromPayment.id,
        transactionAmount: '60',
        idempotencyKey: 'b042-payment-v-credit-note-a',
      }),
      ar.reconcile({
        ...input,
        debitJournalLineId: raceDebit,
        creditJournalLineId: raceCreditFromNote.id,
        transactionAmount: '60',
        idempotencyKey: 'b042-payment-v-credit-note-b',
      }),
    ]);
    expect(
      raceResults.filter((row) => row.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      (await ar.listOpenItems(companyId, customerId)).find(
        (row) => row.id === raceDebit,
      )?.remainingAmount,
    ).toBe('40');
  });

  it('reverses a foreign-currency settlement without technical open items or GL residue', async () => {
    await configureUsdCash();
    const invoice = await postInvoice('100', 'USD', '2');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    const payment = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('100', maturity.journalLineId!, '100', 'USD', '1.9'),
    );
    const posted = await payments.postDraft(
      companyId,
      ownerId,
      payment.id,
      new Date('2026-11-02'),
      'b042-fx-reversal-post',
    );
    const before = await prisma.aRReconciliation.findFirstOrThrow({
      where: { customerPaymentId: payment.id },
    });
    const reversed = await payments.reverse(
      companyId,
      ownerId,
      payment.id,
      new Date('2026-11-03'),
      'fx reversal',
      'fx-rev',
    );
    const after = await prisma.aRReconciliation.findFirstOrThrow({
      where: { id: before.id },
    });
    expect(after.status).toBe(ARReconciliationStatus.REVERSED);
    const adjustment = await prisma.journalEntry.findUniqueOrThrow({
      where: { id: before.adjustmentJournalEntryId! },
    });
    const paymentEntry = await prisma.journalEntry.findUniqueOrThrow({
      where: { id: posted.journalEntryId! },
    });
    expect(adjustment.status).toBe(JournalEntryStatus.REVERSED);
    expect(paymentEntry.status).toBe(JournalEntryStatus.REVERSED);
    expect(
      (await ar.listOpenItems(companyId, customerId)).find(
        (row) => row.id === maturity.journalLineId,
      ),
    ).toMatchObject({
      remainingTransactionAmount: '100',
      remainingBaseAmount: '200',
    });
    await assertNoTechnicalOpenItems();
    const entryIds = [
      invoice.journalEntryId,
      posted.journalEntryId,
      before.adjustmentJournalEntryId,
      reversed.reversalJournalEntryId,
      after.reversalJournalEntryId,
    ].filter((id): id is string => Boolean(id));
    const gl = await prisma.journalLine.findMany({
      where: {
        journalEntryId: { in: entryIds },
        businessPartnerId: customerId,
        account: { accountType: AccountingAccountType.ASSET_RECEIVABLE },
      },
    });
    expect(
      gl.reduce(
        (sum, line) => sum + Number(line.debit) - Number(line.credit),
        0,
      ),
    ).toBe(200);
  });

  it('rolls back payment, reconciliation, and FX adjustment when posting fails at the lifecycle boundary', async () => {
    const invoice = await postInvoice('30');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    const payment = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('30', maturity.journalLineId!),
    );
    await prisma.$executeRaw(
      Prisma.sql`CREATE OR REPLACE FUNCTION b042_fail_payment_post() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'b042 injected payment post failure'; END; $$ LANGUAGE plpgsql`,
    );
    await prisma.$executeRaw(
      Prisma.sql`CREATE TRIGGER b042_fail_payment_post BEFORE UPDATE OF "status" ON "CustomerPayment" FOR EACH ROW WHEN (NEW."status" = 'POSTED') EXECUTE FUNCTION b042_fail_payment_post()`,
    );
    try {
      await expect(
        payments.postDraft(
          companyId,
          ownerId,
          payment.id,
          new Date('2026-10-27'),
          'b042-rollback',
        ),
      ).rejects.toThrow('b042 injected payment post failure');
    } finally {
      await prisma.$executeRaw(
        Prisma.sql`DROP TRIGGER IF EXISTS b042_fail_payment_post ON "CustomerPayment"`,
      );
      await prisma.$executeRaw(
        Prisma.sql`DROP FUNCTION IF EXISTS b042_fail_payment_post()`,
      );
    }
    const rolledBack = await prisma.customerPayment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(rolledBack.status).toBe(CustomerPaymentStatus.DRAFT);
    expect(rolledBack.journalEntryId).toBeNull();
    expect(
      await prisma.aRReconciliation.count({
        where: { customerPaymentId: payment.id },
      }),
    ).toBe(0);
    expect(
      await prisma.journalEntry.count({ where: { sourceId: payment.id } }),
    ).toBe(0);
  });

  it('also rolls back a foreign-currency FX adjustment after the injected lifecycle failure', async () => {
    await configureUsdCash();
    const invoice = await postInvoice('30', 'USD', '2');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    const payment = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('30', maturity.journalLineId!, '30', 'USD', '1.9'),
    );
    await prisma.$executeRaw(
      Prisma.sql`CREATE OR REPLACE FUNCTION b042_fail_payment_post() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'b042 injected payment post failure'; END; $$ LANGUAGE plpgsql`,
    );
    await prisma.$executeRaw(
      Prisma.sql`CREATE TRIGGER b042_fail_payment_post BEFORE UPDATE OF "status" ON "CustomerPayment" FOR EACH ROW WHEN (NEW."status" = 'POSTED') EXECUTE FUNCTION b042_fail_payment_post()`,
    );
    try {
      await expect(
        payments.postDraft(
          companyId,
          ownerId,
          payment.id,
          new Date('2026-11-04'),
          'b042-rollback-fx',
        ),
      ).rejects.toThrow('b042 injected payment post failure');
    } finally {
      await prisma.$executeRaw(
        Prisma.sql`DROP TRIGGER IF EXISTS b042_fail_payment_post ON "CustomerPayment"`,
      );
      await prisma.$executeRaw(
        Prisma.sql`DROP FUNCTION IF EXISTS b042_fail_payment_post()`,
      );
    }
    expect(
      await prisma.aRReconciliation.count({
        where: { customerPaymentId: payment.id },
      }),
    ).toBe(0);
    expect(
      await prisma.journalEntry.count({ where: { sourceId: payment.id } }),
    ).toBe(0);
  });

  it('uses POSTED plus REVERSED AR exposure for the credit-limit decision', async () => {
    const rows = await prisma.$queryRaw<{ exposure: Prisma.Decimal }[]>(
      Prisma.sql`SELECT COALESCE(SUM(jl."debit" - jl."credit"), 0) AS exposure FROM "JournalLine" jl JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" JOIN "AccountingAccount" aa ON aa."id" = jl."accountId" WHERE jl."companyId" = ${companyId} AND jl."businessPartnerId" = ${customerId} AND je."status" IN ('POSTED', 'REVERSED') AND aa."accountType" = 'ASSET_RECEIVABLE'`,
    );
    const before = new Prisma.Decimal(rows[0]?.exposure ?? 0);
    await prisma.customerProfile.update({
      where: { businessPartnerId: customerId },
      data: { creditLimit: before.add(150) },
    });
    const invoice = await postInvoice('100');
    const maturity = await prisma.salesInvoicePaymentSchedule.findFirstOrThrow({
      where: { salesInvoiceId: invoice.id },
    });
    const payment = await payments.createDraft(
      companyId,
      ownerId,
      paymentInput('100', maturity.journalLineId!),
    );
    await payments.postDraft(
      companyId,
      ownerId,
      payment.id,
      new Date('2026-10-28'),
      'b042-credit-limit-post',
    );
    await payments.reverse(
      companyId,
      ownerId,
      payment.id,
      new Date('2026-10-29'),
      'B042 credit limit reversal',
      'b042-credit-limit-reverse',
    );
    await expect(postInvoice('60')).rejects.toThrow(
      'sales.customer_credit_limit_exceeded',
    );
    await prisma.customerProfile.update({
      where: { businessPartnerId: customerId },
      data: { creditLimit: null },
    });
  });
});

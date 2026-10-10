import 'dotenv/config';

import { ConflictException } from '@nestjs/common';
import {
  AccountingAccountType,
  BusinessPartnerType,
  JournalSourceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { InitializeCompanyAccounting } from '../accounting-bootstrap/accounting-bootstrap.service';
import { TemplateService } from '../accounting-bootstrap/template.service';
import { SupplierCreditNoteService } from '../purchases/supplier-credit-note.service';
import { SupplierInvoiceService } from '../purchases/supplier-invoice.service';
import { APReconciliationService } from './ap-reconciliation.service';
import { SupplierPaymentService } from './supplier-payment.service';

jest.setTimeout(90_000);

describe('B06 supplier payments and AP reconciliation', () => {
  let prisma: PrismaService;
  let accounting: AccountingService;
  let invoices: SupplierInvoiceService;
  let creditNotes: SupplierCreditNoteService;
  let payments: SupplierPaymentService;
  let ap: APReconciliationService;
  let companyId: string;
  let ownerId: string;
  let supplierId: string;
  let otherSupplierId: string;
  let cashAccountId: string;
  let bankAccountId: string;
  let paymentTermId: string;

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
      data: { name: `B06 Supplier Payments ${stamp}`, currencyCode: 'EGP' },
    });
    companyId = company.id;
    const owner = await prisma.user.create({
      data: {
        email: `b06-payments-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'B06 Owner',
        companyId,
        role: 'OWNER',
      },
    });
    ownerId = owner.id;
    const term = await prisma.paymentTerm.create({
      data: {
        companyId,
        code: `B06-NET-${stamp}`,
        name: 'B06 Net 30',
        lines: {
          create: [
            {
              sequence: 1,
              calculationType: 'PERCENT',
              percentage: 100,
              dueDays: 30,
            },
          ],
        },
      },
    });
    paymentTermId = term.id;
    const supplier = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `B06-SUP-${stamp}`,
        displayName: 'B06 Supplier',
        partnerType: BusinessPartnerType.ORGANIZATION,
        supplierProfile: { create: { paymentTermId } },
      },
    });
    supplierId = supplier.id;
    const otherSupplier = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `B06-OTHER-${stamp}`,
        displayName: 'B06 Other Supplier',
        partnerType: BusinessPartnerType.ORGANIZATION,
        supplierProfile: { create: { paymentTermId } },
      },
    });
    otherSupplierId = otherSupplier.id;

    const initializer = new InitializeCompanyAccounting(
      prisma,
      new PlatformIdempotencyService(prisma),
      new TemplateService(prisma),
    );
    const bootstrap = await initializer.execute({
      companyId,
      actorUserId: ownerId,
      idempotencyKey: `b06-bootstrap-${stamp}`,
      countryCode: 'EG',
      localeCode: 'en-EG',
      baseCurrencyCode: 'EGP',
      templateCode: 'EG_STANDARD_V1',
      templateVersion: 1,
      fiscalYearStart: new Date('2026-01-01'),
      fiscalYearEnd: new Date('2026-12-31'),
    });
    expect(bootstrap.status).toBe('READY');
    accounting = new AccountingService(
      prisma,
      new PlatformIdempotencyService(prisma),
    );
    const readiness = new AccountingReadinessService(prisma);
    ap = new APReconciliationService(prisma, accounting, readiness);
    payments = new SupplierPaymentService(prisma, accounting, readiness, ap);
    invoices = new SupplierInvoiceService(prisma, accounting, readiness);
    creditNotes = new SupplierCreditNoteService(prisma, accounting, readiness);
    cashAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId, accountType: AccountingAccountType.ASSET_CASH },
      })
    ).id;
    bankAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId, accountType: AccountingAccountType.ASSET_BANK },
      })
    ).id;
  });

  afterAll(async () => prisma?.$disconnect());

  const invoiceLine = (description: string) => ({
    description,
    quantity: '1',
    unitPrice: '1000',
    discountValue: '0',
  });

  async function postInvoice(
    partnerId = supplierId,
    amount = '1000',
    currencyCode = 'EGP',
    exchangeRate = '1',
  ) {
    const draft = await invoices.createDraft(companyId, ownerId, {
      businessPartnerId: partnerId,
      documentDate: new Date('2026-10-10'),
      currencyCode,
      exchangeRate,
      paymentTermId,
      supplierReference: `B06-INV-${Date.now()}-${Math.random()}`,
      lines: [{ ...invoiceLine('B06 payable'), unitPrice: amount }],
    });
    const posted = await invoices.postDraft(
      companyId,
      ownerId,
      draft.id,
      new Date('2026-10-10'),
      `b06-invoice-${draft.id}`,
    );
    return prisma.supplierInvoicePaymentSchedule.findFirstOrThrow({
      where: { supplierInvoiceId: posted.id },
    });
  }

  function paymentInput(
    amount: string,
    allocations: Array<{ journalLineId: string; amount: string }> = [],
    sourceAccountId = cashAccountId,
    currencyCode = 'EGP',
    exchangeRate = '1',
  ) {
    return {
      businessPartnerId: supplierId,
      paymentDate: new Date('2026-10-11'),
      method: 'CASH' as const,
      sourceAccountId,
      transactionCurrencyCode: currencyCode,
      exchangeRate,
      amount,
      allocations,
    };
  }

  async function configureUsdCash() {
    await prisma.currency.upsert({
      where: { code: 'USD' },
      update: { isActive: true, minorUnitPrecision: 2 },
      create: { code: 'USD', name: 'US Dollar', minorUnitPrecision: 2 },
    });
    const journal = await prisma.accountingJournal.create({
      data: {
        companyId,
        code: `B06-USD-CASH-${Date.now()}`,
        name: 'B06 USD Cash',
        type: 'CASH',
        currencyCode: 'USD',
      },
    });
    const configuration =
      await prisma.accountingConfiguration.findUniqueOrThrow({
        where: { companyId },
      });
    const mapping =
      await prisma.accountingConfigurationJournal.findFirstOrThrow({
        where: {
          companyId,
          configurationId: configuration.id,
          settingKey: 'CASH',
        },
      });
    await prisma.accountingConfigurationJournal.update({
      where: { id: mapping.id },
      data: { journalId: journal.id },
    });
  }

  async function configureEgpCash() {
    const journal = await prisma.accountingJournal.create({
      data: {
        companyId,
        code: `B06-EGP-CASH-${Date.now()}`,
        name: 'B06 EGP Cash',
        type: 'CASH',
        currencyCode: 'EGP',
      },
    });
    const configuration =
      await prisma.accountingConfiguration.findUniqueOrThrow({
        where: { companyId },
      });
    const mapping =
      await prisma.accountingConfigurationJournal.findFirstOrThrow({
        where: {
          companyId,
          configurationId: configuration.id,
          settingKey: 'CASH',
        },
      });
    await prisma.accountingConfigurationJournal.update({
      where: { id: mapping.id },
      data: { journalId: journal.id },
    });
  }

  it('posts full and partial settlements against authoritative AP maturities', async () => {
    const schedule = await postInvoice(supplierId, '1000');
    const draft = await payments.createDraft(companyId, ownerId, {
      ...paymentInput('600', [
        { journalLineId: schedule.journalLineId!, amount: '600' },
      ]),
      idempotencyKey: `b06-partial-${schedule.id}`,
    });
    const posted = await payments.postDraft(
      companyId,
      ownerId,
      draft.id,
      new Date('2026-10-11'),
      `b06-post-${draft.id}`,
    );
    expect(posted.status).toBe('POSTED');
    const reconciliation = await prisma.aPReconciliation.findFirstOrThrow({
      where: { supplierPaymentId: posted.id },
    });
    expect(reconciliation.transactionAmount.toString()).toBe('600');
    expect(reconciliation.debitJournalLineId).toBe(posted.apJournalLineId);
    expect(reconciliation.creditJournalLineId).toBe(schedule.journalLineId);
    const open = await payments.listOpenItems(companyId, supplierId);
    expect(
      open.some(
        (row) =>
          row.id === schedule.journalLineId && row.remainingAmount === '400',
      ),
    ).toBe(true);
  });

  it('supports on-account payments and later reconciliation with idempotent replay', async () => {
    const schedule = await postInvoice(supplierId, '500');
    const alternateSchedule = await postInvoice(supplierId, '300');
    const draft = await payments.createDraft(companyId, ownerId, {
      ...paymentInput('500'),
      idempotencyKey: `b06-on-account-${schedule.id}`,
    });
    const posted = await payments.postDraft(
      companyId,
      ownerId,
      draft.id,
      new Date('2026-10-11'),
      `b06-on-account-post-${draft.id}`,
    );
    expect(posted.unappliedAmount.toString()).toBe('500');
    expect(posted.remainingUnappliedAmount).toBe('500');
    const result = await payments.reconcileOnAccount(
      companyId,
      ownerId,
      posted.id,
      schedule.journalLineId!,
      '200',
      `b06-on-account-reconcile-${posted.id}`,
      new Date('2026-10-12'),
    );
    expect(result.transactionAmount.toString()).toBe('200');
    expect(
      (await payments.findOne(companyId, posted.id)).remainingUnappliedAmount,
    ).toBe('300');
    expect(
      (await payments.findOne(companyId, posted.id)).unappliedAmount.toString(),
    ).toBe('500');
    const replay = await payments.reconcileOnAccount(
      companyId,
      ownerId,
      posted.id,
      schedule.journalLineId!,
      '200',
      `b06-on-account-reconcile-${posted.id}`,
      new Date('2026-10-12'),
    );
    expect(replay.id).toBe(result.id);
    await expect(
      payments.reconcileOnAccount(
        companyId,
        ownerId,
        posted.id,
        schedule.journalLineId!,
        '201',
        `b06-on-account-reconcile-${posted.id}`,
        new Date('2026-10-12'),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      payments.reconcileOnAccount(
        companyId,
        ownerId,
        posted.id,
        alternateSchedule.journalLineId!,
        '200',
        `b06-on-account-reconcile-${posted.id}`,
        new Date('2026-10-12'),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      payments.reconcileOnAccount(
        companyId,
        ownerId,
        posted.id,
        schedule.journalLineId!,
        '200',
        `b06-on-account-reconcile-${posted.id}`,
        new Date('2026-10-13'),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await ap.reverse({
      companyId,
      actorUserId: ownerId,
      reconciliationId: result.id,
      postingDate: new Date('2026-10-14'),
      reason: 'B06 focused reversal',
      idempotencyKey: `b06-on-account-reversal-${posted.id}`,
    });
    expect(
      (await payments.findOne(companyId, posted.id)).remainingUnappliedAmount,
    ).toBe('500');
    expect(
      (await payments.findOne(companyId, posted.id)).unappliedAmount.toString(),
    ).toBe('500');
  });

  it('rejects wrong source account types, cross-supplier targets, and changed idempotent drafts', async () => {
    const schedule = await postInvoice(supplierId, '300');
    await expect(
      payments.createDraft(companyId, ownerId, {
        ...paymentInput('100', [], bankAccountId),
        method: 'CASH',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const otherSchedule = await postInvoice(otherSupplierId, '300');
    await expect(
      payments.createDraft(companyId, ownerId, {
        ...paymentInput('100', [
          { journalLineId: otherSchedule.journalLineId!, amount: '100' },
        ]),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const key = `b06-draft-idempotency-${schedule.id}`;
    const first = await payments.createDraft(companyId, ownerId, {
      ...paymentInput('50'),
      idempotencyKey: key,
    });
    const replay = await payments.createDraft(companyId, ownerId, {
      ...paymentInput('50'),
      idempotencyKey: key,
    });
    expect(replay.id).toBe(first.id);
    await expect(
      payments.createDraft(companyId, ownerId, {
        ...paymentInput('51'),
        idempotencyKey: key,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('carries historical AP base amounts and records a realized FX loss', async () => {
    await configureUsdCash();
    const schedule = await postInvoice(supplierId, '100', 'USD', '2');
    const draft = await payments.createDraft(companyId, ownerId, {
      ...paymentInput(
        '100',
        [{ journalLineId: schedule.journalLineId!, amount: '100' }],
        cashAccountId,
        'USD',
        '2.1',
      ),
      idempotencyKey: `b06-fx-${schedule.id}`,
    });
    const posted = await payments.postDraft(
      companyId,
      ownerId,
      draft.id,
      new Date('2026-10-12'),
      `b06-fx-post-${draft.id}`,
    );
    const reconciliation = await prisma.aPReconciliation.findFirstOrThrow({
      where: { supplierPaymentId: posted.id },
    });
    expect(reconciliation.debitBaseAmountApplied.toString()).toBe('210');
    expect(reconciliation.creditBaseAmountApplied.toString()).toBe('200');
    expect(reconciliation.realizedFxAmount.toString()).toBe('-10');
    expect(reconciliation.adjustmentJournalEntryId).toBeTruthy();
    const adjustment = await prisma.journalEntry.findUniqueOrThrow({
      where: { id: reconciliation.adjustmentJournalEntryId! },
      include: { lines: true },
    });
    expect(
      adjustment.lines
        .reduce(
          (sum, line) => sum.add(line.debit).sub(line.credit),
          new Prisma.Decimal(0),
        )
        .isZero(),
    ).toBe(true);
    await configureEgpCash();
  });

  it('treats supplier credit notes as debit AP open items and reconciles them explicitly', async () => {
    const schedule = await postInvoice(supplierId, '1000');
    const invoice = await prisma.supplierInvoice.findFirstOrThrow({
      where: { id: schedule.supplierInvoiceId },
      include: { lines: true },
    });
    const noteDraft = await creditNotes.createDraft(companyId, ownerId, {
      supplierInvoiceId: invoice.id,
      documentDate: new Date('2026-10-13'),
      reason: 'B06 supplier credit',
      lines: [
        { originalSupplierInvoiceLineId: invoice.lines[0].id, quantity: '0.5' },
      ],
    });
    const note = await creditNotes.postDraft(
      companyId,
      ownerId,
      noteDraft.id,
      new Date('2026-10-13'),
      `b06-credit-${noteDraft.id}`,
    );
    const noteEntry = await prisma.journalEntry.findFirstOrThrow({
      where: { id: note.journalEntryId!, companyId },
      include: { lines: true },
    });
    expect(noteEntry.sourceType).toBe(JournalSourceType.SUPPLIER_CREDIT_NOTE);
    const debit = noteEntry.lines.find((line) => line.debit.gt(0))!;
    const reconciliation = await ap.reconcile({
      companyId,
      actorUserId: ownerId,
      debitJournalLineId: debit.id,
      creditJournalLineId: schedule.journalLineId!,
      transactionAmount: '500',
      idempotencyKey: `b06-credit-reconcile-${note.id}`,
      postingDate: new Date('2026-10-14'),
    });
    expect(reconciliation.status).toBe('ACTIVE');
    const open = await payments.listOpenItems(companyId, supplierId);
    expect(
      open.some((row) => row.id === debit.id && row.type === 'DEBIT'),
    ).toBe(false);
  });

  it('reopens the AP item after controlled payment reversal without losing the audit trail', async () => {
    const schedule = await postInvoice(supplierId, '700');
    const draft = await payments.createDraft(companyId, ownerId, {
      ...paymentInput('700', [
        { journalLineId: schedule.journalLineId!, amount: '700' },
      ]),
      idempotencyKey: `b06-reversal-${schedule.id}`,
    });
    const posted = await payments.postDraft(
      companyId,
      ownerId,
      draft.id,
      new Date('2026-10-15'),
      `b06-reversal-post-${draft.id}`,
    );
    const reversed = await payments.reverse(
      companyId,
      ownerId,
      posted.id,
      new Date('2026-10-16'),
      'B06 test reversal',
      `b06-reversal-key-${posted.id}`,
    );
    expect(reversed.status).toBe('REVERSED');
    expect(
      await prisma.aPReconciliation.count({
        where: { supplierPaymentId: posted.id, status: 'REVERSED' },
      }),
    ).toBe(1);
    const open = await payments.listOpenItems(companyId, supplierId);
    expect(
      open.some(
        (row) =>
          row.id === schedule.journalLineId &&
          new Prisma.Decimal(row.remainingAmount).eq(700),
      ),
    ).toBe(true);
  });
});

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AccountingConfigJournalKey,
  AccountingJournalType,
  JournalSourceType,
  Prisma,
  SalesCreditNoteStatus,
  SalesDocumentType,
  TaxCalculationMode,
  TaxTreatmentCategory,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { SalesTaxCalculatorService } from './sales-tax-calculator.service';
import {
  CreateSalesCreditNoteInput,
  SalesCreditNoteLineInput,
  SalesCreditNoteQuery,
  PostSalesCreditNoteInput,
} from './dto';
import {
  SALES_CREDIT_NOTE_INCLUDE,
  SalesCreditNoteRepository,
} from './sales-credit-note.repository';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';

type CreditSourceLine = {
  id: string;
  quantity: Prisma.Decimal;
  taxableBase: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  revenueAccountId: string | null;
  taxes: Array<{ taxLiabilityAccountId: string | null }>;
};
type LockedCreditNote = {
  id: string;
  companyId: string;
  salesInvoice: { lines: CreditSourceLine[] };
  lines: Array<{
    id: string;
    originalSalesInvoiceLineId: string;
    quantity: Prisma.Decimal;
    taxableBase: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }>;
};

@Injectable()
export class SalesCreditNoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tax: SalesTaxCalculatorService,
    @Optional() private readonly accounting?: AccountingService,
    @Optional() private readonly repository?: SalesCreditNoteRepository,
    @Optional() private readonly readiness?: AccountingReadinessService,
  ) {}

  async createDraft(
    companyId: string,
    actorUserId: string,
    input: CreateSalesCreditNoteInput,
  ) {
    return this.prisma.$transaction(async (db) => {
      const source = await this.loadPostedInvoice(
        db,
        companyId,
        input.salesInvoiceId,
      );
      const currency = await db.currency.findFirst({
        where: { code: source.transactionCurrencyCode, isActive: true },
      });
      if (!currency) throw new BadRequestException('sales.currency_inactive');
      const calculation = await this.calculateLines(
        db,
        companyId,
        source,
        input.lines,
        currency.minorUnitPrecision,
      );
      const reason = input.reason.trim();
      if (!reason)
        throw new BadRequestException('sales.credit_note_reason_required');
      const note = await db.salesCreditNote.create({
        data: {
          companyId,
          salesInvoiceId: source.id,
          businessPartnerId: source.businessPartnerId,
          status: SalesCreditNoteStatus.DRAFT,
          documentDate: input.documentDate,
          transactionCurrencyCode: source.transactionCurrencyCode,
          exchangeRate: source.exchangeRate,
          reason,
          subtotal: calculation.subtotal,
          taxTotal: calculation.taxTotal,
          grandTotal: calculation.grandTotal,
          partnerCodeSnapshot: source.partnerCodeSnapshot,
          partnerNameSnapshot: source.partnerNameSnapshot,
          taxRegistrationNumberSnapshot: source.taxRegistrationNumberSnapshot,
          billingAddressSnapshot: source.billingAddressSnapshot,
          createdById: actorUserId,
          lines: { create: calculation.lines },
        } as any,
      });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'sales-credit-note.created',
          entityType: 'SalesCreditNote',
          entityId: note.id,
          metadata: {
            salesInvoiceId: source.id,
            grandTotal: note.grandTotal.toString(),
          },
        },
      });
      return db.salesCreditNote.findFirstOrThrow({
        where: { id: note.id, companyId },
        include: SALES_CREDIT_NOTE_INCLUDE,
      });
    });
  }

  async deleteDraft(companyId: string, actorUserId: string, id: string) {
    return this.prisma.$transaction(async (db) => {
      const note = await db.salesCreditNote.findFirst({
        where: { id, companyId },
      });
      if (!note) throw new NotFoundException('Sales credit note not found');
      if (note.status !== SalesCreditNoteStatus.DRAFT) {
        throw new BadRequestException('sales.posted_credit_note_immutable');
      }
      await db.salesCreditNote.delete({ where: { id } });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'sales-credit-note.deleted',
          entityType: 'SalesCreditNote',
          entityId: id,
          metadata: { status: SalesCreditNoteStatus.DRAFT },
        },
      });
      return { id };
    });
  }

  async updateDraft(
    companyId: string,
    actorUserId: string,
    id: string,
    input: CreateSalesCreditNoteInput,
  ) {
    return this.prisma.$transaction(async (db) => {
      const existing = await db.salesCreditNote.findFirst({
        where: { id, companyId },
      });
      if (!existing) throw new NotFoundException('Sales credit note not found');
      if (existing.status !== SalesCreditNoteStatus.DRAFT) {
        throw new BadRequestException('sales.posted_credit_note_immutable');
      }
      const source = await this.loadPostedInvoice(
        db,
        companyId,
        input.salesInvoiceId,
      );
      const currency = await db.currency.findFirst({
        where: { code: source.transactionCurrencyCode, isActive: true },
      });
      if (!currency) throw new BadRequestException('sales.currency_inactive');
      const reason = input.reason.trim();
      if (!reason)
        throw new BadRequestException('sales.credit_note_reason_required');
      const calculation = await this.calculateLines(
        db,
        companyId,
        source,
        input.lines,
        currency.minorUnitPrecision,
      );
      await db.salesCreditNoteLine.deleteMany({
        where: { companyId, salesCreditNoteId: id },
      });
      await db.salesCreditNote.update({
        where: { id },
        data: {
          salesInvoiceId: source.id,
          businessPartnerId: source.businessPartnerId,
          documentDate: input.documentDate,
          reason,
          subtotal: calculation.subtotal,
          taxTotal: calculation.taxTotal,
          grandTotal: calculation.grandTotal,
          partnerCodeSnapshot: source.partnerCodeSnapshot,
          partnerNameSnapshot: source.partnerNameSnapshot,
          taxRegistrationNumberSnapshot: source.taxRegistrationNumberSnapshot,
          billingAddressSnapshot: source.billingAddressSnapshot,
          lines: { create: calculation.lines },
        } as any,
      });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'sales-credit-note.updated',
          entityType: 'SalesCreditNote',
          entityId: id,
          metadata: { status: SalesCreditNoteStatus.DRAFT },
        },
      });
      return db.salesCreditNote.findFirstOrThrow({
        where: { id, companyId },
        include: SALES_CREDIT_NOTE_INCLUDE,
      });
    });
  }

  async postDraft(
    companyId: string,
    actorUserId: string,
    id: string,
    input?: PostSalesCreditNoteInput,
  ) {
    if (!this.accounting)
      throw new ConflictException('Accounting service is not available');
    const accounting = this.accounting;
    return this.prisma.$transaction(async (db) => {
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "SalesCreditNote"
        WHERE "id" = ${id} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      const noteForLock = await db.salesCreditNote.findFirst({
        where: { id, companyId },
        select: { salesInvoiceId: true },
      });
      if (!noteForLock)
        throw new NotFoundException('Sales credit note not found');
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "SalesInvoice"
        WHERE "id" = ${noteForLock.salesInvoiceId} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "SalesInvoiceLine"
        WHERE "salesInvoiceId" = ${noteForLock.salesInvoiceId} AND "companyId" = ${companyId}
        ORDER BY "id" FOR UPDATE
      `);
      const note = await db.salesCreditNote.findFirst({
        where: { id, companyId },
        include: {
          salesInvoice: { include: { lines: { include: { taxes: true } } } },
          businessPartner: { include: { customerProfile: true } },
          lines: { include: { taxes: true }, orderBy: { sequence: 'asc' } },
        },
      });
      if (!note) throw new NotFoundException('Sales credit note not found');
      if (note.status === SalesCreditNoteStatus.POSTED) {
        if (
          input?.idempotencyKey &&
          note.idempotencyKey !== input.idempotencyKey
        ) {
          throw new ConflictException(
            'Sales credit note is already posted with another idempotency key',
          );
        }
        if (
          input?.idempotencyKey &&
          note.requestHash !==
            createHash('sha256')
              .update(
                `${note.id}:${input.idempotencyKey}:${this.dateOnly(input.postingDate)}`,
              )
              .digest('hex')
        ) {
          throw new ConflictException(
            'Idempotency key payload does not match the original posting',
          );
        }
        return db.salesCreditNote.findFirstOrThrow({
          where: { id, companyId },
          include: SALES_CREDIT_NOTE_INCLUDE,
        });
      }
      const postingDateValue = input?.postingDate ?? note.documentDate;
      if (this.readiness) {
        const readiness = await this.readiness.evaluateInTransaction(
          db,
          companyId,
          postingDateValue,
        );
        if (!readiness.ready)
          throw new ConflictException(
            `Accounting is not ready: ${readiness.reasons.join(', ')}`,
          );
      }
      const currency = await db.currency.findFirst({
        where: { code: note.transactionCurrencyCode, isActive: true },
      });
      if (!currency) throw new BadRequestException('sales.currency_inactive');
      const refreshed = await this.rebuildCreditAmountsUnderLock(
        db,
        note,
        currency.minorUnitPrecision,
      );
      Object.assign(note, refreshed);
      await this.assertLinesAvailable(
        db,
        companyId,
        note.salesInvoiceId,
        note.lines,
      );
      const period = await db.accountingPeriod.findFirst({
        where: {
          companyId,
          startDate: { lte: postingDateValue },
          endDate: { gte: postingDateValue },
        },
        include: { fiscalYear: true },
      });
      if (!period)
        throw new ConflictException(
          'No accounting period covers the credit note date',
        );
      const configuration = await db.accountingConfiguration.findUnique({
        where: { companyId },
        include: { accountDefaults: true, journalDefaults: true },
      });
      if (!configuration)
        throw new ConflictException(
          'Accounting configuration must be initialized before posting',
        );
      const journalMapping = configuration.journalDefaults.find(
        (mapping) => mapping.settingKey === AccountingConfigJournalKey.SALES,
      );
      const journal = journalMapping
        ? await db.accountingJournal.findFirst({
            where: { id: journalMapping.journalId, companyId, isActive: true },
          })
        : null;
      if (!journal)
        throw new ConflictException('Active sales journal mapping is required');
      if (journal.type !== AccountingJournalType.SALES) {
        throw new ConflictException(
          'Configured sales journal must have SALES type',
        );
      }
      const originalInvoice = note.salesInvoice;
      if (!originalInvoice.receivableAccountId) {
        throw new ConflictException(
          'Original invoice accounting basis is missing',
        );
      }
      const originalLines = new Map(
        originalInvoice.lines.map((line) => [line.id, line] as const),
      );
      for (const line of note.lines) {
        const original = originalLines.get(line.originalSalesInvoiceLineId);
        if (
          !original?.revenueAccountId ||
          (line.taxAmount.gt(0) && !original.taxes[0]?.taxLiabilityAccountId)
        ) {
          throw new ConflictException(
            'Original invoice accounting basis is incomplete',
          );
        }
      }
      const number = await this.allocateDocumentNumber(
        db,
        companyId,
        period.fiscalYearId,
        period.fiscalYear.startDate,
      );
      const lines = [
        {
          accountId: originalInvoice.receivableAccountId,
          transactionDebit: '0',
          transactionCredit: note.grandTotal.toString(),
          description: note.partnerNameSnapshot,
          businessPartnerId: note.businessPartnerId,
          documentReference: number,
          reconciliationReference: note.id,
        },
        ...note.lines.map((line) => ({
          accountId: originalLines.get(line.originalSalesInvoiceLineId)!
            .revenueAccountId!,
          transactionDebit: line.taxableBase.toString(),
          transactionCredit: '0',
          description: line.descriptionSnapshot,
          documentReference: number,
          taxTreatmentCode: line.taxes[0]?.treatmentCodeSnapshot,
          taxRate: line.taxes[0]?.percentageSnapshot.toString(),
        })),
        ...note.lines
          .filter((line) => line.taxAmount.gt(0))
          .map((line) => ({
            accountId: originalLines.get(line.originalSalesInvoiceLineId)!
              .taxes[0].taxLiabilityAccountId!,
            transactionDebit: line.taxAmount.toString(),
            transactionCredit: '0',
            description: `Tax reversal - ${line.descriptionSnapshot}`,
            documentReference: number,
            taxTreatmentCode: line.taxes[0]?.treatmentCodeSnapshot,
            taxRate: line.taxes[0]?.percentageSnapshot.toString(),
          })),
      ];
      const requestKey =
        input?.idempotencyKey?.trim() || `sales-credit-note:${note.id}:post`;
      const requestHash = createHash('sha256')
        .update(`${note.id}:${requestKey}:${this.dateOnly(postingDateValue)}`)
        .digest('hex');
      const journalEntry = await accounting.postInternalInTransaction(
        db,
        companyId,
        actorUserId,
        {
          journalId: journal.id,
          accountingPeriodId: period.id,
          postingDate: this.dateOnly(postingDateValue),
          documentDate: this.dateOnly(note.documentDate),
          transactionCurrencyCode: note.transactionCurrencyCode,
          exchangeRate: note.exchangeRate.toString(),
          documentReference: number,
          description: `Sales credit note ${number}`,
          sourceType: JournalSourceType.SALES_CREDIT_NOTE,
          sourceId: note.id,
          idempotencyKey: requestKey,
          lines,
        },
      );
      await db.salesCreditNote.update({
        where: { id },
        data: {
          status: SalesCreditNoteStatus.POSTED,
          creditNoteNumber: number,
          postingDate: postingDateValue,
          postedById: actorUserId,
          postedAt: new Date(),
          journalEntryId: journalEntry.id,
          idempotencyKey: requestKey,
          requestHash,
          receivableAccountId: originalInvoice.receivableAccountId,
        },
      });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'sales-credit-note.posted',
          entityType: 'SalesCreditNote',
          entityId: note.id,
          metadata: {
            creditNoteNumber: number,
            journalEntryId: journalEntry.id,
          },
        },
      });
      return db.salesCreditNote.findFirstOrThrow({
        where: { id, companyId },
        include: SALES_CREDIT_NOTE_INCLUDE,
      });
    });
  }

  findOne(companyId: string, id: string) {
    return (this.repository ?? new SalesCreditNoteRepository(this.prisma))
      .findOne(companyId, id)
      .then((note) => {
        if (!note) throw new NotFoundException('Sales credit note not found');
        return note;
      });
  }

  findAll(companyId: string, query: SalesCreditNoteQuery = {}) {
    return (
      this.repository ?? new SalesCreditNoteRepository(this.prisma)
    ).findMany(companyId, query);
  }

  private async loadPostedInvoice(
    db: Prisma.TransactionClient,
    companyId: string,
    id: string,
  ) {
    const source = await db.salesInvoice.findFirst({
      where: { id, companyId },
      include: {
        lines: { include: { taxes: true }, orderBy: { sequence: 'asc' } },
      },
    });
    if (!source) throw new NotFoundException('Sales invoice not found');
    if (source.status !== 'POSTED')
      throw new BadRequestException(
        'sales.credit_note_requires_posted_invoice',
      );
    return source;
  }

  private async calculateLines(
    db: Prisma.TransactionClient,
    companyId: string,
    source: Awaited<ReturnType<SalesCreditNoteService['loadPostedInvoice']>>,
    inputs: SalesCreditNoteLineInput[],
    precision: number,
  ) {
    const seen = new Set<string>();
    const lines = [] as any[];
    let subtotal = new Prisma.Decimal(0);
    let taxTotal = new Prisma.Decimal(0);
    for (const input of inputs) {
      if (seen.has(input.originalSalesInvoiceLineId))
        throw new BadRequestException('sales.credit_note_duplicate_line');
      seen.add(input.originalSalesInvoiceLineId);
      const original = source.lines.find(
        (line) => line.id === input.originalSalesInvoiceLineId,
      );
      if (!original)
        throw new NotFoundException('Original sales invoice line not found');
      const quantity = this.decimal(
        input.quantity,
        'sales.credit_note_quantity_invalid',
      );
      if (quantity.lte(0))
        throw new BadRequestException('sales.credit_note_quantity_invalid');
      const credited = await db.salesCreditNoteLine.aggregate({
        where: {
          companyId,
          originalSalesInvoiceLineId: original.id,
          salesCreditNote: { status: 'POSTED' },
        },
        _sum: { quantity: true },
      });
      const remaining = original.quantity.sub(
        credited._sum.quantity ?? new Prisma.Decimal(0),
      );
      if (quantity.gt(remaining))
        throw new BadRequestException(
          'sales.credit_note_quantity_exceeds_remaining',
        );
      const taxableBase = original.taxableBase
        .mul(quantity)
        .div(original.quantity)
        .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
      const taxAmount = original.taxAmount
        .mul(quantity)
        .div(original.quantity)
        .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
      const lineTotal = taxableBase
        .add(taxAmount)
        .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
      const tax = original.taxes[0];
      lines.push({
        originalSalesInvoiceLineId: original.id,
        sequence: lines.length + 1,
        descriptionSnapshot: original.descriptionSnapshot,
        quantity,
        unitPrice: original.unitPrice,
        taxableBase,
        taxAmount,
        lineTotal,
        revenueAccountId: original.revenueAccountId,
        taxLiabilityAccountId: tax?.taxLiabilityAccountId ?? null,
        taxes: {
          create: {
            treatmentCodeSnapshot:
              tax?.treatmentCodeSnapshot ?? TaxTreatmentCategory.OUT_OF_SCOPE,
            treatmentCategory:
              tax?.treatmentCategory ?? TaxTreatmentCategory.OUT_OF_SCOPE,
            rateCodeSnapshot: tax?.rateCodeSnapshot ?? null,
            percentageSnapshot: tax?.percentageSnapshot ?? 0,
            calculationMode:
              tax?.calculationMode ?? TaxCalculationMode.TAX_EXCLUSIVE,
            taxableBase,
            taxAmount,
          },
        },
      });
      subtotal = subtotal.add(taxableBase);
      taxTotal = taxTotal.add(taxAmount);
    }
    return { lines, subtotal, taxTotal, grandTotal: subtotal.add(taxTotal) };
  }

  private async assertLinesAvailable(
    db: Prisma.TransactionClient,
    companyId: string,
    invoiceId: string,
    lines: Array<{
      originalSalesInvoiceLineId: string;
      quantity: Prisma.Decimal;
    }>,
  ) {
    for (const line of lines) {
      const original = await db.salesInvoiceLine.findFirst({
        where: {
          id: line.originalSalesInvoiceLineId,
          salesInvoiceId: invoiceId,
          companyId,
        },
      });
      if (!original)
        throw new BadRequestException(
          'sales.credit_note_original_line_invalid',
        );
      const credited = await db.salesCreditNoteLine.aggregate({
        where: {
          companyId,
          originalSalesInvoiceLineId: line.originalSalesInvoiceLineId,
          salesCreditNote: { status: 'POSTED' },
        },
        _sum: { quantity: true },
      });
      if (
        line.quantity.gt(
          original.quantity.sub(
            credited._sum.quantity ?? new Prisma.Decimal(0),
          ),
        )
      ) {
        throw new BadRequestException(
          'sales.credit_note_quantity_exceeds_remaining',
        );
      }
    }
  }

  private async rebuildCreditAmountsUnderLock(
    db: Prisma.TransactionClient,
    note: LockedCreditNote,
    precision: number,
  ) {
    const source = note.salesInvoice;
    let subtotal = new Prisma.Decimal(0);
    let taxTotal = new Prisma.Decimal(0);
    const lines = [] as any[];
    for (const line of note.lines) {
      const original = source.lines.find(
        (candidate: any) => candidate.id === line.originalSalesInvoiceLineId,
      );
      if (!original)
        throw new BadRequestException(
          'sales.credit_note_original_line_invalid',
        );
      const prior = await db.salesCreditNoteLine.aggregate({
        where: {
          companyId: note.companyId,
          originalSalesInvoiceLineId: original.id,
          salesCreditNote: { status: SalesCreditNoteStatus.POSTED },
        },
        _sum: { quantity: true, taxableBase: true, taxAmount: true },
      });
      const remainingQuantity = original.quantity.sub(
        prior._sum.quantity ?? new Prisma.Decimal(0),
      );
      if (line.quantity.gt(remainingQuantity))
        throw new BadRequestException(
          'sales.credit_note_quantity_exceeds_remaining',
        );
      const remainingBase = original.taxableBase.sub(
        prior._sum.taxableBase ?? new Prisma.Decimal(0),
      );
      const remainingTax = original.taxAmount.sub(
        prior._sum.taxAmount ?? new Prisma.Decimal(0),
      );
      const isFinal = line.quantity.eq(remainingQuantity);
      const taxableBase = isFinal
        ? remainingBase
        : (() => {
            const value = original.taxableBase
              .mul(line.quantity)
              .div(original.quantity)
              .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
            return value.gt(remainingBase) ? remainingBase : value;
          })();
      const taxAmount = isFinal
        ? remainingTax
        : (() => {
            const value = original.taxAmount
              .mul(line.quantity)
              .div(original.quantity)
              .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
            return value.gt(remainingTax) ? remainingTax : value;
          })();
      const lineTotal = taxableBase
        .add(taxAmount)
        .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
      await db.salesCreditNoteLine.update({
        where: { id: line.id },
        data: { taxableBase, taxAmount, lineTotal },
      });
      await db.salesCreditNoteLineTax.updateMany({
        where: { companyId: note.companyId, salesCreditNoteLineId: line.id },
        data: { taxableBase, taxAmount },
      });
      const updated = { ...line, taxableBase, taxAmount, lineTotal };
      lines.push(updated);
      subtotal = subtotal.add(taxableBase);
      taxTotal = taxTotal.add(taxAmount);
    }
    const grandTotal = subtotal.add(taxTotal);
    await db.salesCreditNote.update({
      where: { id: note.id },
      data: { subtotal, taxTotal, grandTotal },
    });
    return { lines, subtotal, taxTotal, grandTotal };
  }

  private async allocateDocumentNumber(
    db: Prisma.TransactionClient,
    companyId: string,
    fiscalYearId: string,
    fiscalYearStartDate: Date,
  ) {
    const rows = await db.$queryRaw<{ allocated: number }[]>(Prisma.sql`
      INSERT INTO "SalesDocumentSequence" ("id", "companyId", "fiscalYearId", "documentType", "nextValue", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${companyId}, ${fiscalYearId}, ${SalesDocumentType.SALES_CREDIT_NOTE}::"SalesDocumentType", 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("companyId", "fiscalYearId", "documentType")
      DO UPDATE SET "nextValue" = "SalesDocumentSequence"."nextValue" + 1, "updatedAt" = CURRENT_TIMESTAMP
      RETURNING ("nextValue" - 1) AS "allocated"
    `);
    const allocated = rows[0]?.allocated;
    if (!allocated)
      throw new ConflictException('Unable to allocate credit note number');
    return `CN-${fiscalYearStartDate.getUTCFullYear()}-${String(allocated).padStart(6, '0')}`;
  }

  private decimal(value: Prisma.Decimal.Value, message: string) {
    try {
      const result = new Prisma.Decimal(value);
      if (!result.isFinite()) throw new Error();
      return result;
    } catch {
      throw new BadRequestException(message);
    }
  }

  private dateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }
}

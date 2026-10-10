import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
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
} from './dto';
import {
  SALES_CREDIT_NOTE_INCLUDE,
  SalesCreditNoteRepository,
} from './sales-credit-note.repository';

@Injectable()
export class SalesCreditNoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tax: SalesTaxCalculatorService,
    @Optional() private readonly accounting?: AccountingService,
    @Optional() private readonly repository?: SalesCreditNoteRepository,
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

  async postDraft(companyId: string, actorUserId: string, id: string) {
    if (!this.accounting)
      throw new ConflictException('Accounting service is not available');
    const accounting = this.accounting;
    return this.prisma.$transaction(async (db) => {
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
        return db.salesCreditNote.findFirstOrThrow({
          where: { id, companyId },
          include: SALES_CREDIT_NOTE_INCLUDE,
        });
      }
      await this.assertLinesAvailable(db, note.salesInvoiceId, note.lines);
      const period = await db.accountingPeriod.findFirst({
        where: {
          companyId,
          startDate: { lte: note.documentDate },
          endDate: { gte: note.documentDate },
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
      const mappedAccounts = new Map(
        configuration.accountDefaults.map((mapping) => [
          mapping.settingKey,
          mapping.accountId,
        ]),
      );
      const revenueAccountId = mappedAccounts.get(
        AccountingConfigAccountKey.INCOME,
      );
      const taxAccountId = mappedAccounts.get(
        AccountingConfigAccountKey.TAX_PAYABLE,
      );
      const receivableAccountId =
        note.businessPartner.customerProfile?.receivableAccountId ??
        mappedAccounts.get(AccountingConfigAccountKey.RECEIVABLE);
      if (!revenueAccountId || !receivableAccountId) {
        throw new ConflictException(
          'Receivable and income account mappings are required',
        );
      }
      if (note.lines.some((line) => line.taxAmount.gt(0)) && !taxAccountId) {
        throw new ConflictException(
          'Tax payable account mapping is required for taxable credit notes',
        );
      }
      const number = await this.allocateDocumentNumber(
        db,
        companyId,
        period.fiscalYearId,
      );
      const lines = [
        {
          accountId: receivableAccountId,
          transactionDebit: '0',
          transactionCredit: note.grandTotal.toString(),
          description: note.partnerNameSnapshot,
          businessPartnerId: note.businessPartnerId,
          documentReference: number,
          reconciliationReference: note.id,
        },
        ...note.lines.map((line) => ({
          accountId: revenueAccountId,
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
            accountId: taxAccountId!,
            transactionDebit: line.taxAmount.toString(),
            transactionCredit: '0',
            description: `Tax reversal - ${line.descriptionSnapshot}`,
            documentReference: number,
            taxTreatmentCode: line.taxes[0]?.treatmentCodeSnapshot,
            taxRate: line.taxes[0]?.percentageSnapshot.toString(),
          })),
      ];
      const journalEntry = await accounting.postInternalInTransaction(
        db,
        companyId,
        actorUserId,
        {
          journalId: journal.id,
          accountingPeriodId: period.id,
          postingDate: this.dateOnly(note.documentDate),
          documentDate: this.dateOnly(note.documentDate),
          transactionCurrencyCode: note.transactionCurrencyCode,
          exchangeRate: note.exchangeRate.toString(),
          documentReference: number,
          description: `Sales credit note ${number}`,
          sourceType: JournalSourceType.SALES_CREDIT_NOTE,
          sourceId: note.id,
          idempotencyKey: `sales-credit-note:${note.id}:post`,
          lines,
        },
      );
      await db.salesCreditNote.update({
        where: { id },
        data: {
          status: SalesCreditNoteStatus.POSTED,
          creditNoteNumber: number,
          postingDate: note.documentDate,
          postedById: actorUserId,
          postedAt: new Date(),
          journalEntryId: journalEntry.id,
          idempotencyKey: `sales-credit-note:${note.id}:post`,
          requestHash: createHash('sha256')
            .update(`${note.id}:${number}`)
            .digest('hex'),
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
        },
      });
      if (!original)
        throw new BadRequestException(
          'sales.credit_note_original_line_invalid',
        );
      const credited = await db.salesCreditNoteLine.aggregate({
        where: {
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

  private async allocateDocumentNumber(
    db: Prisma.TransactionClient,
    companyId: string,
    fiscalYearId: string,
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
    return `CN-${new Date().getUTCFullYear()}-${String(allocated).padStart(6, '0')}`;
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

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JournalSourceType,
  Prisma,
  SupplierCreditNoteStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { CreateSupplierCreditNoteDto } from './dto/purchases.dto';
import {
  accountingMappings,
  dateOnly,
  decimal,
  mapDuplicate,
  nextValue,
  ZERO,
} from './purchases.helpers';

@Injectable()
export class SupplierCreditNoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly readiness: AccountingReadinessService,
  ) {}

  async createDraft(
    companyId: string,
    actorUserId: string,
    input: CreateSupplierCreditNoteDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) =>
        this.createIn(db, companyId, actorUserId, input),
      );
    } catch (error) {
      mapDuplicate(error);
      throw error;
    }
  }

  async updateDraft(
    companyId: string,
    actorUserId: string,
    id: string,
    input: CreateSupplierCreditNoteDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        const existing = await db.supplierCreditNote.findFirst({
          where: { id, companyId },
        });
        if (!existing)
          throw new NotFoundException('Supplier credit note not found');
        if (existing.status !== SupplierCreditNoteStatus.DRAFT)
          throw new ConflictException(
            'Posted supplier credit notes are immutable',
          );
        await db.supplierCreditNoteLine.deleteMany({
          where: { companyId, supplierCreditNoteId: id },
        });
        return this.createIn(db, companyId, actorUserId, input, id);
      });
    } catch (error) {
      mapDuplicate(error);
      throw error;
    }
  }

  async postDraft(
    companyId: string,
    actorUserId: string,
    id: string,
    postingDate: Date,
    idempotencyKey: string,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        const note = await db.supplierCreditNote.findFirst({
          where: { id, companyId },
          include: {
            lines: { include: { taxes: true } },
            supplierInvoice: true,
          },
        });
        if (!note)
          throw new NotFoundException('Supplier credit note not found');
        const date = dateOnly(postingDate);
        if (note.status === SupplierCreditNoteStatus.POSTED) {
          if (note.requestHash === this.requestHash(id, idempotencyKey, date))
            return note;
          throw new ConflictException(
            'Posted supplier credit notes are immutable',
          );
        }
        await db.$queryRaw(
          Prisma.sql`SELECT "id" FROM "SupplierInvoice" WHERE "id" = ${note.supplierInvoiceId} AND "companyId" = ${companyId} FOR UPDATE`,
        );
        const readiness = await this.readiness.evaluateInTransaction(
          db,
          companyId,
          date,
        );
        if (!readiness.ready)
          throw new BadRequestException(
            `Accounting is not ready: ${readiness.reasons.join(', ')}`,
          );
        const mapping = await accountingMappings(db, companyId);
        const payable = note.payableAccountId
          ? await db.accountingAccount.findFirst({
              where: { id: note.payableAccountId, companyId, isActive: true },
            })
          : mapping.payable;
        if (
          !payable ||
          payable.accountType !== 'LIABILITY_PAYABLE' ||
          !payable.isControlAccount ||
          !payable.reconciliationEligible
        )
          throw new BadRequestException('Supplier payable account is invalid');
        const lines: Array<any> = [
          {
            accountId: payable.id,
            transactionDebit: note.grandTotal.toFixed(4),
            transactionCredit: '0',
            description: `Supplier credit note ${note.creditNoteNumber ?? note.id}`,
            businessPartnerId: note.businessPartnerId,
            documentReference: note.creditNoteNumber ?? undefined,
            reconciliationReference: `AP:${note.supplierInvoiceId}`,
          },
        ];
        for (const line of note.lines) {
          const accountId =
            line.accountType === 'EXPENSE'
              ? line.expenseAccountId
              : line.assetAccountId;
          if (!accountId)
            throw new BadRequestException(
              'Every supplier credit note line must resolve to an expense or asset account',
            );
          lines.push({
            accountId,
            transactionDebit: '0',
            transactionCredit: line.taxableBase.toFixed(4),
            description: `Credit: ${line.descriptionSnapshot}`,
            businessPartnerId: note.businessPartnerId,
            documentReference: note.creditNoteNumber ?? undefined,
            reconciliationReference: `AP:${note.supplierInvoiceId}`,
          });
          for (const tax of line.taxes)
            if (tax.taxAmount.gt(0)) {
              if (!tax.taxInputAccountId)
                throw new BadRequestException(
                  'Input tax account is not configured for the supplier credit note',
                );
              lines.push({
                accountId: tax.taxInputAccountId,
                transactionDebit: '0',
                transactionCredit: tax.taxAmount.toFixed(4),
                description: `Input tax reversal: ${line.descriptionSnapshot}`,
                businessPartnerId: note.businessPartnerId,
                taxCode: tax.rateCodeSnapshot ?? undefined,
                taxTreatmentCode: tax.treatmentCodeSnapshot,
                taxRate: tax.percentageSnapshot.toFixed(4),
                reconciliationReference: `AP:${note.supplierInvoiceId}`,
              });
            }
        }
        const period = await db.accountingPeriod.findFirstOrThrow({
          where: {
            companyId,
            status: 'OPEN',
            startDate: { lte: date },
            endDate: { gte: date },
          },
        });
        const entry = await this.accounting.postInternalInTransaction(
          db,
          companyId,
          actorUserId,
          {
            journalId: mapping.journal.id,
            accountingPeriodId: period.id,
            postingDate: date.toISOString(),
            documentDate: note.documentDate.toISOString(),
            transactionCurrencyCode: note.transactionCurrencyCode,
            exchangeRate: note.exchangeRate.toFixed(8),
            documentReference: note.creditNoteNumber ?? undefined,
            description: `Supplier credit note ${note.creditNoteNumber ?? note.id}`,
            sourceType: JournalSourceType.SUPPLIER_CREDIT_NOTE,
            sourceId: note.id,
            idempotencyKey,
            lines,
          },
        );
        const updated = await db.supplierCreditNote.update({
          where: { id },
          data: {
            status: SupplierCreditNoteStatus.POSTED,
            creditNoteNumber:
              note.creditNoteNumber ??
              (await nextValue(db, companyId, 'SCN', date)),
            postingDate: date,
            postedById: actorUserId,
            postedAt: new Date(),
            journalEntryId: (entry as any).id,
            payableAccountId: payable.id,
            idempotencyKey,
            requestHash: this.requestHash(id, idempotencyKey, date),
          },
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'supplier-credit-note.posted',
          id,
          { journalEntryId: (entry as any).id, idempotencyKey },
        );
        return updated;
      });
    } catch (error) {
      mapDuplicate(error);
      throw error;
    }
  }

  findAll(companyId: string, status?: SupplierCreditNoteStatus) {
    return this.prisma.supplierCreditNote.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      orderBy: [{ documentDate: 'desc' }, { creditNoteNumber: 'desc' }],
      include: { supplierInvoice: true, businessPartner: true },
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.supplierCreditNote.findFirstOrThrow({
      where: { id, companyId },
      include: {
        supplierInvoice: true,
        businessPartner: true,
        lines: { include: { taxes: true } },
        journalEntry: { include: { lines: true } },
      },
    });
  }

  private async createIn(
    db: Prisma.TransactionClient,
    companyId: string,
    actorUserId: string,
    input: CreateSupplierCreditNoteDto,
    replacingId?: string,
  ) {
    const reason = input.reason.trim();
    if (!reason)
      throw new BadRequestException('Credit note reason is required');
    await db.$queryRaw(
      Prisma.sql`SELECT "id" FROM "SupplierInvoice" WHERE "id" = ${input.supplierInvoiceId} AND "companyId" = ${companyId} FOR UPDATE`,
    );
    const invoice = await db.supplierInvoice.findFirst({
      where: { id: input.supplierInvoiceId, companyId, status: 'POSTED' },
      include: {
        businessPartner: true,
        lines: { include: { taxes: true } },
        creditNotes: { include: { lines: true } },
      },
    });
    if (!invoice)
      throw new BadRequestException(
        'Credit notes can only reference a posted supplier invoice',
      );
    const already = new Map<string, Prisma.Decimal>();
    for (const note of invoice.creditNotes)
      for (const line of note.lines)
        already.set(
          line.originalSupplierInvoiceLineId,
          (already.get(line.originalSupplierInvoiceLineId) ?? ZERO).plus(
            line.quantity,
          ),
        );
    const selected = new Set<string>();
    const resultLines: any[] = [];
    let subtotal = ZERO,
      taxTotal = ZERO,
      grandTotal = ZERO;
    for (let index = 0; index < input.lines.length; index++) {
      const request = input.lines[index];
      if (selected.has(request.originalSupplierInvoiceLineId))
        throw new ConflictException('A credit note line cannot be repeated');
      selected.add(request.originalSupplierInvoiceLineId);
      const source = invoice.lines.find(
        (line) => line.id === request.originalSupplierInvoiceLineId,
      );
      if (!source)
        throw new BadRequestException(
          'Credit note line does not belong to the referenced supplier invoice',
        );
      const quantity = decimal(request.quantity, 'Credit quantity');
      if (
        quantity.lte(0) ||
        quantity.gt(source.quantity.minus(already.get(source.id) ?? ZERO))
      )
        throw new ConflictException(
          'Credit note quantity exceeds the uninvoiced supplier quantity',
        );
      const ratio = quantity.div(source.quantity);
      const base = source.taxableBase
        .mul(ratio)
        .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
      const tax = source.taxAmount
        .mul(ratio)
        .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
      const total = base
        .plus(tax)
        .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
      subtotal = subtotal.plus(base);
      taxTotal = taxTotal.plus(tax);
      grandTotal = grandTotal.plus(total);
      resultLines.push({
        originalSupplierInvoiceLineId: source.id,
        sequence: index + 1,
        descriptionSnapshot: source.descriptionSnapshot,
        quantity,
        unitPrice: source.unitPrice,
        taxableBase: base,
        taxAmount: tax,
        lineTotal: total,
        accountType: source.accountType,
        expenseAccountId: source.expenseAccountId,
        assetAccountId: source.assetAccountId,
        taxes: source.taxes.length
          ? {
              create: source.taxes.map((item) => ({
                taxTreatmentId: item.taxTreatmentId,
                taxRateId: item.taxRateId,
                taxInputAccountId: item.taxInputAccountId,
                treatmentCodeSnapshot: item.treatmentCodeSnapshot,
                treatmentCategory: item.treatmentCategory,
                rateCodeSnapshot: item.rateCodeSnapshot,
                percentageSnapshot: item.percentageSnapshot,
                calculationMode: item.calculationMode,
                taxableBase: item.taxableBase
                  .mul(ratio)
                  .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP),
                taxAmount: item.taxAmount
                  .mul(ratio)
                  .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP),
              })),
            }
          : undefined,
      });
    }
    if (grandTotal.lte(0))
      throw new BadRequestException('Credit note total must be positive');
    const data: any = {
      companyId,
      supplierInvoiceId: invoice.id,
      businessPartnerId: invoice.businessPartnerId,
      status: SupplierCreditNoteStatus.DRAFT,
      documentDate: dateOnly(new Date(input.documentDate)),
      transactionCurrencyCode: invoice.transactionCurrencyCode,
      exchangeRate: invoice.exchangeRate,
      reason,
      subtotal: subtotal.toDecimalPlaces(4),
      taxTotal: taxTotal.toDecimalPlaces(4),
      grandTotal: grandTotal.toDecimalPlaces(4),
      partnerCodeSnapshot: invoice.partnerCodeSnapshot,
      partnerNameSnapshot: invoice.partnerNameSnapshot,
      taxRegistrationNumberSnapshot: invoice.taxRegistrationNumberSnapshot,
      billingAddressSnapshot: invoice.billingAddressSnapshot,
      payableAccountId:
        invoice.payableAccountId ?? (await this.payableFallback(db, companyId)),
      createdById: actorUserId,
      lines: { create: resultLines },
    };
    const note = replacingId
      ? await db.supplierCreditNote.update({ where: { id: replacingId }, data })
      : await db.supplierCreditNote.create({ data });
    await this.audit(
      db,
      companyId,
      actorUserId,
      replacingId
        ? 'supplier-credit-note.updated'
        : 'supplier-credit-note.created',
      note.id,
      { supplierInvoiceId: invoice.id, grandTotal: grandTotal.toString() },
    );
    return this.findOneIn(db, companyId, note.id);
  }

  private async payableFallback(
    db: Prisma.TransactionClient,
    companyId: string,
  ) {
    return (await accountingMappings(db, companyId)).payable.id;
  }
  private findOneIn(
    db: Prisma.TransactionClient,
    companyId: string,
    id: string,
  ) {
    return db.supplierCreditNote.findFirstOrThrow({
      where: { id, companyId },
      include: {
        supplierInvoice: true,
        businessPartner: true,
        lines: { include: { taxes: true } },
      },
    });
  }
  private requestHash(id: string, key: string, postingDate: Date) {
    return require('crypto')
      .createHash('sha256')
      .update(`${id}:${key}:${postingDate.toISOString().slice(0, 10)}`)
      .digest('hex');
  }
  private audit(
    db: Prisma.TransactionClient,
    companyId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    return db.auditLog.create({
      data: {
        companyId,
        actorUserId,
        action,
        entityType: 'SupplierCreditNote',
        entityId,
        metadata: metadata as any,
      },
    });
  }
}

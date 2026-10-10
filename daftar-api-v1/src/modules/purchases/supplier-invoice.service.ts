import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JournalSourceType,
  Prisma,
  SupplierInvoiceStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { PaymentTermsCalculator } from '../payment-terms/payment-terms.calculator';
import {
  CreateSupplierInvoiceDto,
  PurchaseLineInput,
} from './dto/purchases.dto';
import {
  accountingMappings,
  assertAccounts,
  calculateLines,
  dateOnly,
  lineCreateData,
  mapDuplicate,
  nextValue,
  partySnapshot,
} from './purchases.helpers';

@Injectable()
export class SupplierInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly readiness: AccountingReadinessService,
  ) {}

  async createDraft(
    companyId: string,
    actorUserId: string,
    input: CreateSupplierInvoiceDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) =>
        this.createDraftIn(db, companyId, actorUserId, input),
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
    input: CreateSupplierInvoiceDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        const existing = await db.supplierInvoice.findFirst({
          where: { id, companyId },
        });
        if (!existing)
          throw new NotFoundException('Supplier invoice not found');
        if (existing.status !== SupplierInvoiceStatus.DRAFT)
          throw new ConflictException('Posted supplier invoices are immutable');
        const created = await this.createDraftIn(
          db,
          companyId,
          actorUserId,
          input,
          id,
        );
        return created;
      });
    } catch (error) {
      mapDuplicate(error);
      throw error;
    }
  }

  async deleteDraft(companyId: string, actorUserId: string, id: string) {
    return this.prisma.$transaction(async (db) => {
      const invoice = await db.supplierInvoice.findFirst({
        where: { id, companyId },
      });
      if (!invoice) throw new NotFoundException('Supplier invoice not found');
      if (invoice.status !== SupplierInvoiceStatus.DRAFT)
        throw new ConflictException('Posted supplier invoices are immutable');
      await db.supplierInvoice.delete({ where: { id } });
      await this.audit(
        db,
        companyId,
        actorUserId,
        'supplier-invoice.deleted',
        id,
        {},
      );
      return { id };
    });
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
        const existing = await db.supplierInvoice.findFirst({
          where: { id, companyId },
          include: {
            lines: { include: { taxes: true } },
            paymentTerm: { include: { lines: true } },
            businessPartner: { include: { supplierProfile: true } },
          },
        });
        if (!existing)
          throw new NotFoundException('Supplier invoice not found');
        if (existing.status === SupplierInvoiceStatus.POSTED) {
          if (existing.idempotencyKey === idempotencyKey) return existing;
          throw new ConflictException('Posted supplier invoices are immutable');
        }
        const date = dateOnly(postingDate);
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
        const profile = existing.businessPartner.supplierProfile;
        const payable = profile?.payableAccountId
          ? await db.accountingAccount.findFirst({
              where: {
                id: profile.payableAccountId,
                companyId,
                isActive: true,
              },
            })
          : mapping.payable;
        if (
          !payable ||
          payable.accountType !== 'LIABILITY_PAYABLE' ||
          !payable.isControlAccount ||
          !payable.reconciliationEligible
        )
          throw new BadRequestException('Supplier payable account is invalid');
        const term =
          existing.paymentTerm ??
          (profile?.paymentTermId
            ? await db.paymentTerm.findFirst({
                where: {
                  id: existing.paymentTermId ?? profile.paymentTermId!,
                  companyId,
                  isActive: true,
                },
                include: { lines: true },
              })
            : null);
        if (!term || !term.lines.length)
          throw new BadRequestException(
            'A payment term is required before posting a supplier invoice',
          );
        const currency = await db.currency.findFirstOrThrow({
          where: { code: existing.transactionCurrencyCode, isActive: true },
        });
        const schedule = PaymentTermsCalculator.calculate(
          existing.grandTotal,
          existing.documentDate,
          term,
          currency.minorUnitPrecision,
        );
        const lines: Array<any> = [];
        for (const line of existing.lines) {
          const accountId =
            line.accountType === 'EXPENSE'
              ? line.expenseAccountId
              : line.assetAccountId;
          if (!accountId)
            throw new BadRequestException(
              'Every supplier invoice line must resolve to an expense or asset account',
            );
          lines.push({
            accountId,
            transactionDebit: line.taxableBase.toFixed(4),
            transactionCredit: '0',
            description: line.descriptionSnapshot,
            businessPartnerId: existing.businessPartnerId,
            documentReference:
              existing.supplierDocumentReference ??
              existing.invoiceNumber ??
              undefined,
            reconciliationReference: `AP:${existing.id}`,
          });
          for (const tax of line.taxes) {
            if (tax.taxAmount.gt(0)) {
              if (!tax.taxInputAccountId)
                throw new BadRequestException(
                  'Input tax account is not configured for the purchase tax',
                );
              lines.push({
                accountId: tax.taxInputAccountId,
                transactionDebit: tax.taxAmount.toFixed(4),
                transactionCredit: '0',
                description: `Input tax: ${line.descriptionSnapshot}`,
                businessPartnerId: existing.businessPartnerId,
                documentReference:
                  existing.supplierDocumentReference ?? undefined,
                taxCode: tax.rateCodeSnapshot ?? undefined,
                taxTreatmentCode: tax.treatmentCodeSnapshot,
                taxRate: tax.percentageSnapshot.toFixed(4),
              });
            }
          }
        }
        for (const item of schedule)
          lines.push({
            accountId: payable.id,
            transactionDebit: '0',
            transactionCredit: item.amount.toFixed(4),
            description: `AP maturity ${item.sequence}`,
            businessPartnerId: existing.businessPartnerId,
            dueDate: item.dueDate.toISOString(),
            documentReference: existing.supplierDocumentReference ?? undefined,
            reconciliationReference: `AP:${existing.id}`,
          });
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
            documentDate: existing.documentDate.toISOString(),
            transactionCurrencyCode: existing.transactionCurrencyCode,
            exchangeRate: existing.exchangeRate.toFixed(8),
            documentReference:
              existing.supplierDocumentReference ??
              existing.invoiceNumber ??
              undefined,
            description: `Supplier invoice ${existing.invoiceNumber ?? existing.id}`,
            sourceType: JournalSourceType.PURCHASE_INVOICE,
            sourceId: existing.id,
            idempotencyKey,
            lines,
          },
        );
        const entryLines = (entry as any).lines ?? [];
        const payableEntryLines = entryLines.filter(
          (line: any) => line.accountId === payable.id,
        );
        const invoiceNumber =
          existing.invoiceNumber ??
          (await nextValue(db, companyId, 'SI', date));
        const updated = await db.supplierInvoice.update({
          where: { id },
          data: {
            status: SupplierInvoiceStatus.POSTED,
            invoiceNumber,
            postingDate: date,
            postedById: actorUserId,
            postedAt: new Date(),
            journalEntryId: (entry as any).id,
            payableAccountId: payable.id,
            idempotencyKey,
            requestHash: this.requestHash(id, idempotencyKey),
            paymentSchedule: {
              create: schedule.map((item, index) => ({
                sequence: item.sequence,
                dueDate: item.dueDate,
                amount: item.amount,
                journalLineId: payableEntryLines[index]?.id ?? null,
                paymentTermCodeSnapshot: term.code,
                paymentTermNameSnapshot: term.name,
              })),
            },
          },
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'supplier-invoice.posted',
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

  findAll(companyId: string, status?: SupplierInvoiceStatus) {
    return this.prisma.supplierInvoice.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      orderBy: [{ documentDate: 'desc' }, { invoiceNumber: 'desc' }],
      include: { businessPartner: true, paymentSchedule: true },
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.supplierInvoice.findFirstOrThrow({
      where: { id, companyId },
      include: {
        businessPartner: true,
        lines: { orderBy: { sequence: 'asc' }, include: { taxes: true } },
        paymentSchedule: { orderBy: { sequence: 'asc' } },
        journalEntry: { include: { lines: true } },
        creditNotes: true,
      },
    });
  }

  private async createDraftIn(
    db: Prisma.TransactionClient,
    companyId: string,
    actorUserId: string,
    input: CreateSupplierInvoiceDto,
    replacingId?: string,
  ) {
    const context = await partySnapshot(db, companyId, input.businessPartnerId);
    const company = await db.company.findFirstOrThrow({
      where: { id: companyId },
      select: { currencyCode: true },
    });
    const currencyCode = (
      input.currencyCode ??
      context.partner.supplierProfile!.preferredCurrencyCode ??
      company.currencyCode
    ).toUpperCase();
    const currency = await db.currency.findFirst({
      where: { code: currencyCode, isActive: true },
    });
    if (!currency)
      throw new BadRequestException('Purchase currency is inactive or unknown');
    const rate = new Prisma.Decimal(input.exchangeRate);
    if (!rate.isFinite() || rate.lte(0))
      throw new BadRequestException('Exchange rate must be positive');
    if (input.purchaseOrderId) {
      const order = await db.purchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, companyId, status: 'APPROVED' },
      });
      if (!order)
        throw new BadRequestException(
          'Only an approved purchase order can be converted',
        );
      if (
        order.businessPartnerId !== input.businessPartnerId ||
        order.transactionCurrencyCode !== currencyCode
      )
        throw new BadRequestException(
          'Supplier invoice does not match the purchase order supplier or currency',
        );
    }
    const calculation = await calculateLines(
      db,
      companyId,
      input.lines as PurchaseLineInput[],
      currency.minorUnitPrecision,
    );
    await assertAccounts(db, companyId, calculation.lines);
    const paymentTermId =
      input.paymentTermId ??
      context.partner.supplierProfile!.paymentTermId ??
      null;
    if (paymentTermId) {
      const term = await db.paymentTerm.findFirst({
        where: { id: paymentTermId, companyId, isActive: true },
        include: { lines: true },
      });
      if (!term || !term.lines.length)
        throw new BadRequestException(
          'Payment term is invalid or has no lines',
        );
    }
    if (replacingId) {
      await db.supplierInvoiceLine.deleteMany({
        where: { companyId, supplierInvoiceId: replacingId },
      });
      await db.supplierInvoice.update({
        where: { id: replacingId },
        data: {
          businessPartnerId: input.businessPartnerId,
          purchaseOrderId: input.purchaseOrderId ?? null,
          documentDate: dateOnly(new Date(input.documentDate)),
          dueDate: input.dueDate ? dateOnly(new Date(input.dueDate)) : null,
          transactionCurrencyCode: currencyCode,
          exchangeRate: rate,
          paymentTermId,
          supplierDocumentReference: input.supplierReference?.trim() || null,
          notes: input.notes?.trim() || null,
          subtotal: calculation.subtotal,
          discountTotal: calculation.discountTotal,
          taxableBaseTotal: calculation.taxableBaseTotal,
          taxTotal: calculation.taxTotal,
          grandTotal: calculation.grandTotal,
          ...context.snapshot,
          lines: { create: calculation.lines.map(lineCreateData) },
        } as any,
      });
      await this.audit(
        db,
        companyId,
        actorUserId,
        'supplier-invoice.updated',
        replacingId,
        {},
      );
      return this.findOneIn(db, companyId, replacingId);
    }
    const invoice = await db.supplierInvoice.create({
      data: {
        companyId,
        businessPartnerId: input.businessPartnerId,
        purchaseOrderId: input.purchaseOrderId ?? null,
        status: SupplierInvoiceStatus.DRAFT,
        documentDate: dateOnly(new Date(input.documentDate)),
        dueDate: input.dueDate ? dateOnly(new Date(input.dueDate)) : null,
        transactionCurrencyCode: currencyCode,
        exchangeRate: rate,
        paymentTermId,
        supplierDocumentReference: input.supplierReference?.trim() || null,
        notes: input.notes?.trim() || null,
        subtotal: calculation.subtotal,
        discountTotal: calculation.discountTotal,
        taxableBaseTotal: calculation.taxableBaseTotal,
        taxTotal: calculation.taxTotal,
        grandTotal: calculation.grandTotal,
        ...context.snapshot,
        createdById: actorUserId,
        lines: { create: calculation.lines.map(lineCreateData) },
      } as any,
    });
    await this.audit(
      db,
      companyId,
      actorUserId,
      'supplier-invoice.created',
      invoice.id,
      { purchaseOrderId: input.purchaseOrderId ?? null },
    );
    return this.findOneIn(db, companyId, invoice.id);
  }

  private findOneIn(
    db: Prisma.TransactionClient,
    companyId: string,
    id: string,
  ) {
    return db.supplierInvoice.findFirstOrThrow({
      where: { id, companyId },
      include: {
        businessPartner: true,
        lines: { include: { taxes: true } },
        paymentSchedule: true,
      },
    });
  }

  private requestHash(id: string, key: string) {
    return require('crypto')
      .createHash('sha256')
      .update(`${id}:${key}`)
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
        entityType: 'SupplierInvoice',
        entityId,
        metadata: metadata as any,
      },
    });
  }
}

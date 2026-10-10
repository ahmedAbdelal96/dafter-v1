import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreatePurchaseOrderDto, PurchaseLineInput } from './dto/purchases.dto';
import {
  assertAccounts,
  calculateLines,
  dateOnly,
  lineCreateData,
  mapDuplicate,
  nextValue,
  partySnapshot,
} from './purchases.helpers';

@Injectable()
export class PurchaseOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(
    companyId: string,
    actorUserId: string,
    input: CreatePurchaseOrderDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        const context = await partySnapshot(
          db,
          companyId,
          input.businessPartnerId,
        );
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
          throw new BadRequestException(
            'Purchase currency is inactive or unknown',
          );
        const rate = new Prisma.Decimal(input.exchangeRate);
        if (!rate.isFinite() || rate.lte(0))
          throw new BadRequestException('Exchange rate must be positive');
        const calculation = await calculateLines(
          db,
          companyId,
          input.lines as PurchaseLineInput[],
          currency.minorUnitPrecision,
          { actorUserId, asOf: new Date(input.documentDate) },
        );
        await assertAccounts(db, companyId, calculation.lines);
        await this.assertPaymentTerm(db, companyId, input.paymentTermId);
        const orderNumber = await nextValue(
          db,
          companyId,
          'PO',
          new Date(input.documentDate),
        );
        const order = await db.purchaseOrder.create({
          data: {
            companyId,
            businessPartnerId: input.businessPartnerId,
            status: PurchaseOrderStatus.DRAFT,
            orderNumber,
            documentDate: dateOnly(new Date(input.documentDate)),
            requestedDeliveryDate: input.requestedDeliveryDate
              ? dateOnly(new Date(input.requestedDeliveryDate))
              : null,
            transactionCurrencyCode: currencyCode,
            exchangeRate: rate,
            paymentTermId:
              input.paymentTermId ??
              context.partner.supplierProfile!.paymentTermId ??
              null,
            supplierReference: input.supplierReference?.trim() || null,
            notes: input.notes?.trim() || null,
            subtotal: calculation.subtotal,
            discountTotal: calculation.discountTotal,
            taxableBaseTotal: calculation.taxableBaseTotal,
            taxTotal: calculation.taxTotal,
            grandTotal: calculation.grandTotal,
            ...context.snapshot,
            createdById: actorUserId,
            lines: {
              create: calculation.lines.map((line, index) =>
                lineCreateData(line, index),
              ),
            },
          } as any,
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'purchase-order.created',
          'PurchaseOrder',
          order.id,
          { orderNumber },
        );
        return this.findOneIn(db, companyId, order.id);
      });
    } catch (error) {
      mapDuplicate(error);
      throw error;
    }
  }

  async updateDraft(
    companyId: string,
    actorUserId: string,
    id: string,
    input: CreatePurchaseOrderDto,
  ) {
    try {
      return await this.prisma.$transaction(async (db) => {
        const existing = await db.purchaseOrder.findFirst({
          where: { id, companyId },
        });
        if (!existing) throw new NotFoundException('Purchase order not found');
        if (existing.status !== PurchaseOrderStatus.DRAFT)
          throw new BadRequestException(
            'Only draft purchase orders can be edited',
          );
        const context = await partySnapshot(
          db,
          companyId,
          input.businessPartnerId,
        );
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
          throw new BadRequestException(
            'Purchase currency is inactive or unknown',
          );
        const rate = new Prisma.Decimal(input.exchangeRate);
        if (!rate.isFinite() || rate.lte(0))
          throw new BadRequestException('Exchange rate must be positive');
        const calculation = await calculateLines(
          db,
          companyId,
          input.lines as PurchaseLineInput[],
          currency.minorUnitPrecision,
          { actorUserId, asOf: new Date(input.documentDate) },
        );
        await assertAccounts(db, companyId, calculation.lines);
        await this.assertPaymentTerm(db, companyId, input.paymentTermId);
        await db.purchaseOrderLine.deleteMany({
          where: { companyId, purchaseOrderId: id },
        });
        await db.purchaseOrder.update({
          where: { id },
          data: {
            businessPartnerId: input.businessPartnerId,
            documentDate: dateOnly(new Date(input.documentDate)),
            requestedDeliveryDate: input.requestedDeliveryDate
              ? dateOnly(new Date(input.requestedDeliveryDate))
              : null,
            transactionCurrencyCode: currencyCode,
            exchangeRate: rate,
            paymentTermId:
              input.paymentTermId ??
              context.partner.supplierProfile!.paymentTermId ??
              null,
            supplierReference: input.supplierReference?.trim() || null,
            notes: input.notes?.trim() || null,
            subtotal: calculation.subtotal,
            discountTotal: calculation.discountTotal,
            taxableBaseTotal: calculation.taxableBaseTotal,
            taxTotal: calculation.taxTotal,
            grandTotal: calculation.grandTotal,
            ...context.snapshot,
            lines: {
              create: calculation.lines.map((line, index) =>
                lineCreateData(line, index),
              ),
            },
          } as any,
        });
        await this.audit(
          db,
          companyId,
          actorUserId,
          'purchase-order.updated',
          'PurchaseOrder',
          id,
          { status: PurchaseOrderStatus.DRAFT },
        );
        return this.findOneIn(db, companyId, id);
      });
    } catch (error) {
      mapDuplicate(error);
      throw error;
    }
  }

  async approve(companyId: string, actorUserId: string, id: string) {
    return this.prisma.$transaction(async (db) => {
      const order = await db.purchaseOrder.findFirst({
        where: { id, companyId },
        include: { lines: true },
      });
      if (!order) throw new NotFoundException('Purchase order not found');
      if (order.status !== PurchaseOrderStatus.DRAFT)
        throw new ConflictException(
          'Only draft purchase orders can be approved',
        );
      if (!order.lines.length || order.grandTotal.lte(0))
        throw new BadRequestException(
          'Purchase order must have positive lines',
        );
      const updated = await db.purchaseOrder.update({
        where: { id },
        data: {
          status: PurchaseOrderStatus.APPROVED,
          approvedById: actorUserId,
          approvedAt: new Date(),
        },
      });
      await this.audit(
        db,
        companyId,
        actorUserId,
        'purchase-order.approved',
        'PurchaseOrder',
        id,
        {},
      );
      return updated;
    });
  }

  async cancel(companyId: string, actorUserId: string, id: string) {
    return this.prisma.$transaction(async (db) => {
      const order = await db.purchaseOrder.findFirst({
        where: { id, companyId },
      });
      if (!order) throw new NotFoundException('Purchase order not found');
      if (
        order.status !== PurchaseOrderStatus.DRAFT &&
        order.status !== PurchaseOrderStatus.APPROVED
      )
        throw new ConflictException('Purchase order cannot be cancelled');
      const linked = await db.supplierInvoice.count({
        where: { companyId, purchaseOrderId: id },
      });
      if (linked)
        throw new ConflictException(
          'A purchase order with supplier invoices cannot be cancelled',
        );
      const updated = await db.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.CANCELLED },
      });
      await this.audit(
        db,
        companyId,
        actorUserId,
        'purchase-order.cancelled',
        'PurchaseOrder',
        id,
        {},
      );
      return updated;
    });
  }

  async convertToInvoice(companyId: string, actorUserId: string, id: string) {
    return this.prisma.$transaction(async (db) => {
      const order = await db.purchaseOrder.findFirst({
        where: { id, companyId },
        include: { lines: { include: { taxes: true } } },
      });
      if (!order) throw new NotFoundException('Purchase order not found');
      if (order.status !== PurchaseOrderStatus.APPROVED)
        throw new ConflictException(
          'Only approved purchase orders can be converted',
        );
      const invoice = await db.supplierInvoice.create({
        data: {
          companyId,
          businessPartnerId: order.businessPartnerId,
          purchaseOrderId: order.id,
          status: 'DRAFT',
          documentDate: order.documentDate,
          transactionCurrencyCode: order.transactionCurrencyCode,
          exchangeRate: order.exchangeRate,
          paymentTermId: order.paymentTermId,
          supplierDocumentReference: order.supplierReference,
          notes: order.notes,
          subtotal: order.subtotal,
          discountTotal: order.discountTotal,
          taxableBaseTotal: order.taxableBaseTotal,
          taxTotal: order.taxTotal,
          grandTotal: order.grandTotal,
          partnerCodeSnapshot: order.partnerCodeSnapshot,
          partnerNameSnapshot: order.partnerNameSnapshot,
          partnerLegalNameSnapshot: order.partnerLegalNameSnapshot,
          taxRegistrationNumberSnapshot: order.taxRegistrationNumberSnapshot,
          billingAddressSnapshot: order.billingAddressSnapshot,
          createdById: actorUserId,
          lines: {
            create: order.lines.map((line, index) => ({
              sequence: index + 1,
              productId: line.productId,
              descriptionSnapshot: line.descriptionSnapshot,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountType: line.discountType,
              discountValue: line.discountValue,
              grossBeforeDiscount: line.grossBeforeDiscount,
              discountAmount: line.discountAmount,
              taxableBase: line.taxableBase,
              taxAmount: line.taxAmount,
              lineTotal: line.lineTotal,
              accountType: line.accountType,
              expenseAccountId: line.expenseAccountId,
              assetAccountId: line.assetAccountId,
              taxes: line.taxes.length
                ? {
                    create: line.taxes.map((tax) => ({
                      taxTreatmentId: tax.taxTreatmentId,
                      taxRateId: tax.taxRateId,
                      treatmentCodeSnapshot: tax.treatmentCodeSnapshot,
                      treatmentCategory: tax.treatmentCategory,
                      rateCodeSnapshot: tax.rateCodeSnapshot,
                      percentageSnapshot: tax.percentageSnapshot,
                      calculationMode: tax.calculationMode,
                      selectionProvenance: tax.selectionProvenance,
                      overrideReasonSnapshot: tax.overrideReasonSnapshot,
                      taxableBase: tax.taxableBase,
                      taxAmount: tax.taxAmount,
                    })),
                  }
                : undefined,
            })),
          },
        } as any,
      });
      await this.audit(
        db,
        companyId,
        actorUserId,
        'purchase-order.converted',
        'PurchaseOrder',
        id,
        { supplierInvoiceId: invoice.id },
      );
      return invoice;
    });
  }

  findAll(companyId: string, status?: PurchaseOrderStatus) {
    return this.prisma.purchaseOrder.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      orderBy: [{ documentDate: 'desc' }, { orderNumber: 'desc' }],
      include: {
        businessPartner: true,
        lines: { orderBy: { sequence: 'asc' }, include: { taxes: true } },
      },
    });
  }

  findOne(companyId: string, id: string) {
    return this.findOneIn(this.prisma, companyId, id);
  }

  private findOneIn(
    db: PrismaService | Prisma.TransactionClient,
    companyId: string,
    id: string,
  ) {
    return db.purchaseOrder.findFirstOrThrow({
      where: { id, companyId },
      include: {
        businessPartner: true,
        lines: { orderBy: { sequence: 'asc' }, include: { taxes: true } },
        supplierInvoices: true,
      },
    });
  }

  private async assertPaymentTerm(
    db: PrismaService | Prisma.TransactionClient,
    companyId: string,
    id?: string,
  ) {
    if (!id) return;
    const term = await db.paymentTerm.findFirst({
      where: { id, companyId, isActive: true },
      include: { lines: true },
    });
    if (!term || !term.lines.length)
      throw new BadRequestException('Payment term is invalid or has no lines');
  }

  private audit(
    db: Prisma.TransactionClient,
    companyId: string,
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    return db.auditLog.create({
      data: {
        companyId,
        actorUserId,
        action,
        entityType,
        entityId,
        metadata: metadata as any,
      },
    });
  }
}

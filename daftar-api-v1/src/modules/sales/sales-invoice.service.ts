import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SalesDiscountType,
  SalesInvoiceStatus,
  TaxCalculationMode,
  TaxTreatmentCategory,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  PaymentTermsCalculator,
  PaymentTermWithLines,
} from '../payment-terms/payment-terms.calculator';
import {
  CreateSalesInvoiceInput,
  SalesInvoiceLineInput,
  SalesInvoiceQuery,
} from './dto';
import {
  SalesInvoiceRepository,
  SALES_INVOICE_INCLUDE,
} from './sales-invoice.repository';
import { SalesPricingService } from './sales-pricing.service';
import { SalesTaxCalculatorService } from './sales-tax-calculator.service';

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SalesInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: SalesPricingService,
    private readonly tax: SalesTaxCalculatorService,
    private readonly repository?: SalesInvoiceRepository,
  ) {}

  async createDraft(
    companyId: string,
    actorUserId: string,
    input: CreateSalesInvoiceInput,
  ) {
    return this.prisma.$transaction(async (db) => {
      const calculation = await this.calculateDraft(db, companyId, input);
      const created = await db.salesInvoice.create({
        data: this.buildCreateData(companyId, actorUserId, input, calculation),
      });

      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'sales-invoice.created',
          entityType: 'SalesInvoice',
          entityId: created.id,
          metadata: {
            status: created.status,
            businessPartnerId: created.businessPartnerId,
            grandTotal: created.grandTotal.toString(),
          },
        },
      });

      return db.salesInvoice.findFirstOrThrow({
        where: { id: created.id, companyId },
        include: SALES_INVOICE_INCLUDE,
      });
    });
  }

  async updateDraft(
    companyId: string,
    actorUserId: string,
    id: string,
    input: CreateSalesInvoiceInput,
  ) {
    return this.prisma.$transaction(async (db) => {
      const existing = await db.salesInvoice.findFirst({
        where: { id, companyId },
      });
      this.requireDraft(existing);

      const calculation = await this.calculateDraft(db, companyId, input);
      await db.salesInvoicePaymentSchedule.deleteMany({
        where: { companyId, salesInvoiceId: id },
      });
      await db.salesInvoiceLine.deleteMany({
        where: { companyId, salesInvoiceId: id },
      });

      await db.salesInvoice.update({
        where: { id },
        data: this.buildUpdateData(input, calculation),
      });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'sales-invoice.updated',
          entityType: 'SalesInvoice',
          entityId: id,
          metadata: { status: SalesInvoiceStatus.DRAFT },
        },
      });

      return db.salesInvoice.findFirstOrThrow({
        where: { id, companyId },
        include: SALES_INVOICE_INCLUDE,
      });
    });
  }

  async deleteDraft(companyId: string, actorUserId: string, id: string) {
    return this.prisma.$transaction(async (db) => {
      const existing = await db.salesInvoice.findFirst({
        where: { id, companyId },
      });
      this.requireDraft(existing);
      await db.salesInvoice.delete({ where: { id } });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'sales-invoice.deleted',
          entityType: 'SalesInvoice',
          entityId: id,
          metadata: { status: SalesInvoiceStatus.DRAFT },
        },
      });
      return { id };
    });
  }

  async findOne(companyId: string, id: string) {
    const result = await (
      this.repository ?? new SalesInvoiceRepository(this.prisma)
    ).findOne(this.prisma, companyId, id);
    if (!result) throw new NotFoundException('Sales invoice not found');
    return result;
  }

  findAll(companyId: string, query: SalesInvoiceQuery = {}) {
    return (
      this.repository ?? new SalesInvoiceRepository(this.prisma)
    ).findMany(companyId, query);
  }

  private async calculateDraft(
    db: Db,
    companyId: string,
    input: CreateSalesInvoiceInput,
  ) {
    const documentDate = this.assertDate(
      input.documentDate,
      'sales.document_date_invalid',
    );
    if (!input.lines.length)
      throw new BadRequestException('sales.lines_required');

    const company = await db.company.findFirst({
      where: { id: companyId },
      select: { id: true, currencyCode: true },
    });
    if (!company) throw new NotFoundException('Company not found');

    const currencyCode = (input.currencyCode ?? company.currencyCode)
      .trim()
      .toUpperCase();
    const currency = await db.currency.findFirst({
      where: { code: currencyCode, isActive: true },
    });
    if (!currency) throw new BadRequestException('sales.currency_inactive');

    const exchangeRate = this.decimal(
      input.exchangeRate,
      'sales.exchange_rate_invalid',
    );
    if (exchangeRate.lte(0))
      throw new BadRequestException('sales.exchange_rate_invalid');

    const partner = await db.businessPartner.findFirst({
      where: { id: input.businessPartnerId, companyId },
      include: {
        customerProfile: true,
        supplierProfile: true,
        addresses: {
          where: { isActive: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });
    if (!partner) throw new NotFoundException('Business partner not found');
    if (!partner.isActive || !partner.customerProfile?.isActive) {
      if (partner.supplierProfile) {
        throw new BadRequestException('sales.partner_customer_role_required');
      }
      throw new BadRequestException('sales.partner_inactive');
    }

    const lineResults = [] as Array<{
      input: SalesInvoiceLineInput;
      product: { id: string; name: string; description: string | null } | null;
      grossBeforeDiscount: Prisma.Decimal;
      discountAmount: Prisma.Decimal;
      taxableBase: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>;
    for (const line of input.lines) {
      const product = line.productId
        ? await db.product.findFirst({
            where: {
              id: line.productId,
              companyId,
              isDeleted: false,
              isActive: true,
            },
            select: { id: true, name: true, description: true },
          })
        : null;
      if (line.productId && !product) {
        throw new BadRequestException('sales.product_invalid');
      }
      const priced = this.pricing.calculateLine({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: {
          type: line.discountType ?? SalesDiscountType.NONE,
          value: line.discountValue ?? '0',
        },
        currencyPrecision: currency.minorUnitPrecision,
      });
      const tax = this.tax.calculateTax({
        rate: null,
        treatmentCode: TaxTreatmentCategory.OUT_OF_SCOPE,
        treatmentCategory: TaxTreatmentCategory.OUT_OF_SCOPE,
        calculationMode: TaxCalculationMode.TAX_EXCLUSIVE,
        enteredAmount: priced.taxableBase,
        asOf: documentDate,
        currencyPrecision: currency.minorUnitPrecision,
      });
      lineResults.push({
        input: line,
        product,
        grossBeforeDiscount: priced.grossBeforeDiscount,
        discountAmount: priced.discountAmount,
        taxableBase: tax.taxableBase,
        taxAmount: tax.taxAmount,
        lineTotal: tax.grossAmount,
      });
    }

    const subtotal = this.sum(
      lineResults.map((line) => line.grossBeforeDiscount),
    );
    const discountTotal = this.sum(
      lineResults.map((line) => line.discountAmount),
    );
    const taxableBaseTotal = this.sum(
      lineResults.map((line) => line.taxableBase),
    );
    const taxTotal = this.sum(lineResults.map((line) => line.taxAmount));
    const grandTotal = this.sum(lineResults.map((line) => line.lineTotal));

    const requestedTermId =
      input.paymentTermId ?? partner.customerProfile.paymentTermId ?? undefined;
    const paymentTerm = requestedTermId
      ? await db.paymentTerm.findFirst({
          where: { id: requestedTermId, companyId, isActive: true },
          include: { lines: { orderBy: { sequence: 'asc' } } },
        })
      : null;
    if (requestedTermId && !paymentTerm) {
      throw new BadRequestException('sales.payment_term_invalid');
    }
    const schedule = paymentTerm
      ? PaymentTermsCalculator.calculate(
          grandTotal,
          documentDate,
          paymentTerm as PaymentTermWithLines,
          currency.minorUnitPrecision,
        )
      : [{ sequence: 1, dueDate: documentDate, amount: grandTotal }];

    return {
      currency,
      currencyCode,
      exchangeRate,
      partner,
      lineResults,
      subtotal,
      discountTotal,
      taxableBaseTotal,
      taxTotal,
      grandTotal,
      paymentTerm,
      schedule,
    };
  }

  private buildCreateData(
    companyId: string,
    actorUserId: string,
    input: CreateSalesInvoiceInput,
    calculation: Awaited<ReturnType<SalesInvoiceService['calculateDraft']>>,
  ) {
    return {
      companyId,
      businessPartnerId: calculation.partner.id,
      status: SalesInvoiceStatus.DRAFT,
      invoiceNumber: null,
      documentDate: input.documentDate,
      transactionCurrencyCode: calculation.currencyCode,
      exchangeRate: calculation.exchangeRate,
      paymentTermId: calculation.paymentTerm?.id ?? null,
      customerReference: input.customerReference?.trim() || null,
      notes: input.notes?.trim() || null,
      subtotal: calculation.subtotal,
      discountTotal: calculation.discountTotal,
      taxableBaseTotal: calculation.taxableBaseTotal,
      taxTotal: calculation.taxTotal,
      grandTotal: calculation.grandTotal,
      partnerCodeSnapshot: calculation.partner.partnerCode,
      partnerNameSnapshot: calculation.partner.displayName,
      partnerLegalNameSnapshot: calculation.partner.legalName,
      taxRegistrationNumberSnapshot: calculation.partner.taxRegistrationNumber,
      billingAddressSnapshot: calculation.partner.addresses[0] ?? null,
      createdById: actorUserId,
      lines: {
        create: calculation.lineResults.map((line, index) =>
          this.lineData(line, index + 1),
        ),
      },
      paymentSchedule: {
        create: calculation.schedule.map((schedule) => ({
          sequence: schedule.sequence,
          dueDate: schedule.dueDate,
          amount: schedule.amount,
          paymentTermCodeSnapshot: calculation.paymentTerm?.code ?? null,
          paymentTermNameSnapshot: calculation.paymentTerm?.name ?? null,
        })),
      },
    } as any;
  }

  private buildUpdateData(
    input: CreateSalesInvoiceInput,
    calculation: Awaited<ReturnType<SalesInvoiceService['calculateDraft']>>,
  ) {
    return {
      businessPartnerId: calculation.partner.id,
      documentDate: input.documentDate,
      transactionCurrencyCode: calculation.currencyCode,
      exchangeRate: calculation.exchangeRate,
      paymentTermId: calculation.paymentTerm?.id ?? null,
      customerReference: input.customerReference?.trim() || null,
      notes: input.notes?.trim() || null,
      subtotal: calculation.subtotal,
      discountTotal: calculation.discountTotal,
      taxableBaseTotal: calculation.taxableBaseTotal,
      taxTotal: calculation.taxTotal,
      grandTotal: calculation.grandTotal,
      partnerCodeSnapshot: calculation.partner.partnerCode,
      partnerNameSnapshot: calculation.partner.displayName,
      partnerLegalNameSnapshot: calculation.partner.legalName,
      taxRegistrationNumberSnapshot: calculation.partner.taxRegistrationNumber,
      billingAddressSnapshot: calculation.partner.addresses[0] ?? null,
      lines: {
        create: calculation.lineResults.map((line, index) =>
          this.lineData(line, index + 1),
        ),
      },
      paymentSchedule: {
        create: calculation.schedule.map((schedule) => ({
          sequence: schedule.sequence,
          dueDate: schedule.dueDate,
          amount: schedule.amount,
          paymentTermCodeSnapshot: calculation.paymentTerm?.code ?? null,
          paymentTermNameSnapshot: calculation.paymentTerm?.name ?? null,
        })),
      },
    } as any;
  }

  private lineData(
    line: Awaited<
      ReturnType<SalesInvoiceService['calculateDraft']>
    >['lineResults'][number],
    sequence: number,
  ) {
    return {
      sequence,
      productId: line.product?.id ?? line.input.productId ?? null,
      descriptionSnapshot:
        line.product?.description?.trim() ||
        line.product?.name ||
        line.input.description.trim(),
      quantity: this.decimal(line.input.quantity, 'sales.quantity_invalid'),
      unitPrice: this.decimal(line.input.unitPrice, 'sales.unit_price_invalid'),
      discountType: line.input.discountType ?? SalesDiscountType.NONE,
      discountValue: this.decimal(
        line.input.discountValue ?? '0',
        'sales.discount_invalid',
      ),
      grossBeforeDiscount: line.grossBeforeDiscount,
      discountAmount: line.discountAmount,
      taxableBase: line.taxableBase,
      taxAmount: line.taxAmount,
      lineTotal: line.lineTotal,
      taxes: {
        create: {
          treatmentCodeSnapshot: TaxTreatmentCategory.OUT_OF_SCOPE,
          treatmentCategory: TaxTreatmentCategory.OUT_OF_SCOPE,
          rateCodeSnapshot: null,
          percentageSnapshot: 0,
          calculationMode: TaxCalculationMode.TAX_EXCLUSIVE,
          taxableBase: line.taxableBase,
          taxAmount: line.taxAmount,
        },
      },
    };
  }

  private requireDraft(
    existing: { status: SalesInvoiceStatus } | null,
  ): asserts existing is { status: SalesInvoiceStatus; id: string } {
    if (!existing) throw new NotFoundException('Sales invoice not found');
    if (existing.status !== SalesInvoiceStatus.DRAFT) {
      throw new BadRequestException('sales.posted_invoice_immutable');
    }
  }

  private assertDate(value: Date, message: string): Date {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new BadRequestException(message);
    }
    return value;
  }

  private decimal(
    value: Prisma.Decimal.Value,
    message: string,
  ): Prisma.Decimal {
    try {
      const decimal = new Prisma.Decimal(value);
      if (!decimal.isFinite()) throw new Error();
      return decimal;
    } catch {
      throw new BadRequestException(message);
    }
  }

  private sum(values: Prisma.Decimal[]): Prisma.Decimal {
    return values.reduce(
      (total, value) => total.add(value),
      new Prisma.Decimal(0),
    );
  }
}

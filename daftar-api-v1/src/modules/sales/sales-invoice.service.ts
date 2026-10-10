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
  AccountingAccountType,
  AccountingJournalType,
  JournalSourceType,
  Prisma,
  SalesDiscountType,
  SalesDocumentType,
  SalesInvoiceStatus,
  TaxModuleKey,
  TaxCalculationMode,
  TaxTreatmentCategory,
  TaxLifecycleStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import {
  PaymentTermsCalculator,
  PaymentTermWithLines,
} from '../payment-terms/payment-terms.calculator';
import {
  CreateSalesInvoiceInput,
  SalesInvoiceLineInput,
  SalesInvoiceQuery,
  PostSalesInvoiceInput,
} from './dto';
import {
  SalesInvoiceRepository,
  SALES_INVOICE_INCLUDE,
} from './sales-invoice.repository';
import { SalesPricingService } from './sales-pricing.service';
import {
  SalesTaxCalculatorService,
  SalesTaxSelectionProvenance,
} from './sales-tax-calculator.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { assertAccountMappingCompatibility } from '../accounting/accounting-policies';

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SalesInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: SalesPricingService,
    private readonly tax: SalesTaxCalculatorService,
    private readonly accounting: AccountingService,
    private readonly readiness: AccountingReadinessService,
    @Optional() private readonly repository?: SalesInvoiceRepository,
  ) {}

  async createDraft(
    companyId: string,
    actorUserId: string,
    input: CreateSalesInvoiceInput,
  ) {
    return this.prisma.$transaction(async (db) => {
      const calculation = await this.calculateDraft(
        db,
        companyId,
        actorUserId,
        input,
      );
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

      const calculation = await this.calculateDraft(
        db,
        companyId,
        actorUserId,
        input,
      );
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

  async postDraft(
    companyId: string,
    actorUserId: string,
    id: string,
    input?: PostSalesInvoiceInput,
  ) {
    const accounting = this.accounting;

    return this.prisma.$transaction(async (db) => {
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "SalesInvoice"
        WHERE "id" = ${id} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      const invoice = await db.salesInvoice.findFirst({
        where: { id, companyId },
        include: {
          businessPartner: { include: { customerProfile: true } },
          lines: { include: { taxes: true }, orderBy: { sequence: 'asc' } },
          paymentSchedule: { orderBy: { sequence: 'asc' } },
        },
      });
      if (!invoice) throw new NotFoundException('Sales invoice not found');
      if (invoice.status === SalesInvoiceStatus.POSTED) {
        if (
          input?.idempotencyKey &&
          invoice.idempotencyKey !== input.idempotencyKey
        ) {
          throw new ConflictException(
            'Sales invoice is already posted with another idempotency key',
          );
        }
        if (
          input?.idempotencyKey &&
          invoice.requestHash !==
            this.postingRequestHash(
              invoice.id,
              input.idempotencyKey,
              this.dateOnly(input.postingDate),
            )
        ) {
          throw new ConflictException(
            'Idempotency key payload does not match the original posting',
          );
        }
        return db.salesInvoice.findFirstOrThrow({
          where: { id, companyId },
          include: SALES_INVOICE_INCLUDE,
        });
      }

      const postingDateValue = input?.postingDate ?? invoice.documentDate;
      this.assertDate(postingDateValue, 'sales.posting_date_invalid');
      const postingDate = this.dateOnly(postingDateValue);
      const readiness = await this.readiness.evaluateInTransaction(
        db,
        companyId,
        postingDateValue,
      );
      if (!readiness.ready) {
        throw new ConflictException(
          `Accounting is not ready: ${readiness.reasons.join(', ')}`,
        );
      }
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "BusinessPartner"
        WHERE "id" = ${invoice.businessPartnerId} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      await this.assertDraftStillCurrent(
        db,
        invoice,
        postingDateValue,
        actorUserId,
      );
      this.assertPaymentSchedule(invoice);
      await this.assertCreditLimit(db, invoice);
      const period = await db.accountingPeriod.findFirst({
        where: {
          companyId,
          startDate: { lte: postingDateValue },
          endDate: { gte: postingDateValue },
        },
        include: { fiscalYear: true },
      });
      if (!period) {
        throw new ConflictException(
          'No accounting period covers the invoice date',
        );
      }

      const configuration = await db.accountingConfiguration.findUnique({
        where: { companyId },
        include: { accountDefaults: true, journalDefaults: true },
      });
      if (!configuration) {
        throw new ConflictException(
          'Accounting configuration must be initialized before posting',
        );
      }
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

      const mappedAccounts = new Map(
        configuration.accountDefaults.map((mapping) => [
          mapping.settingKey,
          mapping.accountId,
        ]),
      );
      const accounts = await this.resolvePostingAccounts(
        db,
        companyId,
        invoice,
        mappedAccounts,
      );
      const allocatedNumber = await this.allocateDocumentNumber(
        db,
        companyId,
        period.fiscalYearId,
        SalesDocumentType.SALES_INVOICE,
        period.fiscalYear.startDate,
      );
      const lines = [
        ...invoice.paymentSchedule.map((schedule) => ({
          accountId: accounts.receivable.id,
          transactionDebit: schedule.amount.toString(),
          transactionCredit: '0',
          description: invoice.partnerNameSnapshot,
          businessPartnerId: invoice.businessPartnerId,
          dueDate: this.dateOnly(schedule.dueDate),
          documentReference: allocatedNumber,
          reconciliationReference: invoice.id,
        })),
        ...invoice.lines.map((line) => ({
          accountId: accounts.revenue.id,
          transactionDebit: '0',
          transactionCredit: line.taxableBase.toString(),
          description: line.descriptionSnapshot,
          documentReference: allocatedNumber,
          taxTreatmentCode: line.taxes[0]?.treatmentCodeSnapshot,
          taxRate: line.taxes[0]?.percentageSnapshot.toString(),
        })),
        ...invoice.lines
          .filter((line) => line.taxAmount.gt(0))
          .map((line) => ({
            accountId: accounts.tax!.id,
            transactionDebit: '0',
            transactionCredit: line.taxAmount.toString(),
            description: `Tax - ${line.descriptionSnapshot}`,
            documentReference: allocatedNumber,
            taxTreatmentCode: line.taxes[0]?.treatmentCodeSnapshot,
            taxRate: line.taxes[0]?.percentageSnapshot.toString(),
          })),
      ];
      const requestKey =
        input?.idempotencyKey?.trim() || `sales-invoice:${invoice.id}:post`;
      const requestHash = this.postingRequestHash(
        invoice.id,
        requestKey,
        postingDate,
      );
      const journalEntry = await accounting.postInternalInTransaction(
        db,
        companyId,
        actorUserId,
        {
          journalId: journal.id,
          accountingPeriodId: period.id,
          postingDate,
          documentDate: this.dateOnly(invoice.documentDate),
          transactionCurrencyCode: invoice.transactionCurrencyCode,
          exchangeRate: invoice.exchangeRate.toString(),
          documentReference: allocatedNumber,
          description: `Sales invoice ${allocatedNumber}`,
          sourceType: JournalSourceType.SALES_INVOICE,
          sourceId: invoice.id,
          idempotencyKey: requestKey,
          lines,
        },
      );

      for (const line of invoice.lines) {
        await db.salesInvoiceLine.update({
          where: { id: line.id },
          data: {
            revenueAccountId: accounts.revenue.id,
            revenueAccountCodeSnapshot: accounts.revenue.code,
          },
        });
        for (const tax of line.taxes) {
          await db.salesInvoiceLineTax.update({
            where: { id: tax.id },
            data: {
              taxLiabilityAccountId: tax.taxAmount.gt(0)
                ? accounts.tax!.id
                : null,
            },
          });
        }
      }
      await db.salesInvoice.update({
        where: { id },
        data: {
          status: SalesInvoiceStatus.POSTED,
          invoiceNumber: allocatedNumber,
          postingDate: postingDateValue,
          postedById: actorUserId,
          postedAt: new Date(),
          journalEntryId: journalEntry.id,
          idempotencyKey: requestKey,
          requestHash,
          receivableAccountId: accounts.receivable.id,
        },
      });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'sales-invoice.posted',
          entityType: 'SalesInvoice',
          entityId: invoice.id,
          metadata: {
            invoiceNumber: allocatedNumber,
            journalEntryId: journalEntry.id,
          },
        },
      });
      return db.salesInvoice.findFirstOrThrow({
        where: { id, companyId },
        include: SALES_INVOICE_INCLUDE,
      });
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
    actorUserId: string,
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

    const taxPolicy = await this.loadCurrentTaxPolicy(
      db,
      companyId,
      actorUserId,
    );
    const defaultSelection =
      taxPolicy.moduleDefault ?? taxPolicy.companyDefault;

    const lineResults = [] as Array<{
      input: SalesInvoiceLineInput;
      product: { id: string; name: string; description: string | null } | null;
      grossBeforeDiscount: Prisma.Decimal;
      discountAmount: Prisma.Decimal;
      taxableBase: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      tax: any;
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
      const explicit =
        line.taxTreatmentId || line.taxRateId
          ? await this.loadExplicitTaxSelection(
              db,
              companyId,
              line.taxTreatmentId,
              line.taxRateId,
            )
          : null;
      const selection = this.tax.resolveTaxSelection({
        moduleEnabled: taxPolicy.moduleEnabled,
        moduleDefault: taxPolicy.moduleDefault,
        companyDefault: taxPolicy.companyDefault,
        explicit,
        allowManualOverride: taxPolicy.allowManualOverride,
        overrideAuthorized: taxPolicy.overrideAuthorized,
      });
      if (explicit && !line.taxOverrideReason?.trim()) {
        throw new BadRequestException('sales.tax_override_reason_required');
      }
      if (explicit) {
        await db.auditLog.create({
          data: {
            companyId,
            actorUserId,
            action: 'sales.tax.override_selected',
            entityType: 'SalesInvoiceLine',
            metadata: {
              lineDescription: line.description,
              normalSelection:
                defaultSelection?.treatmentCode ??
                TaxTreatmentCategory.OUT_OF_SCOPE,
              overrideSelection: explicit.treatmentCode,
              reason: line.taxOverrideReason!.trim(),
            },
          },
        });
      }
      const tax = this.tax.calculateTax({
        ...selection,
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
        tax,
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
          taxTreatmentId: line.tax.treatmentId ?? null,
          treatmentCodeSnapshot: line.tax.treatmentCode,
          treatmentCategory: line.tax.treatmentCategory,
          taxRateId: line.tax.rateId,
          rateCodeSnapshot: line.tax.rateCode,
          percentageSnapshot: line.tax.percentage,
          calculationMode: line.tax.calculationMode,
          selectionProvenance:
            line.tax.selectionProvenance ??
            SalesTaxSelectionProvenance.COMPANY_DEFAULT,
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

  private async loadExplicitTaxSelection(
    db: Db,
    companyId: string,
    treatmentId?: string,
    rateId?: string,
  ) {
    const rate = rateId
      ? await db.taxRate.findFirst({
          where: { id: rateId, companyId },
          include: { treatment: true },
        })
      : null;
    if (rateId && !rate)
      throw new BadRequestException('sales.tax_rate_invalid');
    const treatment = treatmentId
      ? await db.taxTreatment.findFirst({
          where: { id: treatmentId, companyId },
        })
      : rate?.treatment;
    if ((treatmentId || rateId) && !treatment) {
      throw new BadRequestException('sales.tax_treatment_invalid');
    }
    if (rate && rate.companyId !== companyId) {
      throw new BadRequestException('sales.tax_rate_company_mismatch');
    }
    if (treatment && treatment.companyId !== companyId) {
      throw new BadRequestException('sales.tax_treatment_company_mismatch');
    }
    if (rate && treatment && rate.treatmentId !== treatment.id) {
      throw new BadRequestException('sales.tax_rate_treatment_mismatch');
    }
    if (rate && !treatment) {
      throw new BadRequestException('sales.tax_treatment_required');
    }
    return {
      treatmentId: treatment?.id ?? null,
      treatmentCode: treatment?.code ?? TaxTreatmentCategory.OUT_OF_SCOPE,
      treatmentCategory:
        treatment?.category ?? TaxTreatmentCategory.OUT_OF_SCOPE,
      calculationMode:
        treatment?.calculationMode ?? TaxCalculationMode.TAX_EXCLUSIVE,
      rate: rate
        ? {
            id: rate.id,
            code: rate.code,
            percentage: rate.percentage,
            status: rate.status,
            effectiveFrom: rate.effectiveFrom,
            effectiveTo: rate.effectiveTo,
          }
        : null,
      treatmentStatus: treatment?.status,
      treatmentEffectiveFrom: treatment?.effectiveFrom,
      treatmentEffectiveTo: treatment?.effectiveTo,
    };
  }

  private async loadCurrentTaxPolicy(
    db: Db,
    companyId: string,
    actorUserId: string,
  ) {
    const [moduleRule, defaultPolicy, actor] = await Promise.all([
      db.taxModuleApplicabilityRule.findUnique({
        where: {
          companyId_moduleKey: { companyId, moduleKey: TaxModuleKey.SALES },
        },
        include: { defaultRate: true, defaultTreatment: true },
      }),
      db.taxDefaultPolicy.findUnique({
        where: { companyId },
        include: { defaultRate: true, defaultTreatment: true },
      }),
      db.user.findFirst({
        where: { id: actorUserId, companyId },
        include: { permissions: true },
      }),
    ]);
    const moduleDefault = moduleRule?.defaultTreatment
      ? this.taxSelectionFromPolicy(
          moduleRule.defaultTreatment,
          moduleRule.defaultRate,
          moduleRule.defaultTreatment.calculationMode,
        )
      : null;
    const companyDefault = defaultPolicy?.defaultTreatment
      ? this.taxSelectionFromPolicy(
          defaultPolicy.defaultTreatment,
          defaultPolicy.defaultRate,
          defaultPolicy.defaultCalculationMode,
        )
      : null;
    for (const [treatment, rate] of [
      [moduleRule?.defaultTreatment, moduleRule?.defaultRate],
      [defaultPolicy?.defaultTreatment, defaultPolicy?.defaultRate],
    ] as const) {
      if (treatment && treatment.companyId !== companyId)
        throw new BadRequestException('sales.tax_treatment_company_mismatch');
      if (rate && rate.companyId !== companyId)
        throw new BadRequestException('sales.tax_rate_company_mismatch');
      if (treatment && rate && rate.treatmentId !== treatment.id)
        throw new BadRequestException('sales.tax_rate_treatment_mismatch');
    }
    return {
      moduleEnabled: moduleRule?.isEnabled ?? true,
      moduleDefault,
      companyDefault,
      allowManualOverride:
        (moduleRule?.allowOverride ?? true) &&
        (defaultPolicy?.allowManualOverride ?? true),
      overrideAuthorized:
        actor?.role === 'OWNER' ||
        actor?.role === 'SUPER_ADMIN' ||
        (
          actor?.permissions?.permissions as Record<string, unknown> | undefined
        )?.['overrideSalesTax'] === true,
    };
  }

  private taxSelectionFromPolicy(
    treatment: {
      id: string;
      code: string;
      category: TaxTreatmentCategory;
      calculationMode: TaxCalculationMode;
      status: TaxLifecycleStatus;
      effectiveFrom: Date | null;
      effectiveTo: Date | null;
    },
    rate: {
      id: string;
      code: string;
      percentage: Prisma.Decimal;
      status: TaxLifecycleStatus;
      effectiveFrom: Date | null;
      effectiveTo: Date | null;
    } | null,
    calculationMode: TaxCalculationMode,
  ) {
    return {
      treatmentId: treatment.id,
      treatmentCode: treatment.code,
      treatmentCategory: treatment.category,
      calculationMode,
      treatmentStatus: treatment.status,
      treatmentEffectiveFrom: treatment.effectiveFrom,
      treatmentEffectiveTo: treatment.effectiveTo,
      rate: rate
        ? {
            id: rate.id,
            code: rate.code,
            percentage: rate.percentage,
            status: rate.status,
            effectiveFrom: rate.effectiveFrom,
            effectiveTo: rate.effectiveTo,
          }
        : null,
    };
  }

  private async assertCreditLimit(
    db: Prisma.TransactionClient,
    invoice: {
      companyId: string;
      businessPartnerId: string;
      grandTotal: Prisma.Decimal;
      exchangeRate: Prisma.Decimal;
      paymentSchedule: Array<{ amount: Prisma.Decimal }>;
      businessPartner: {
        customerProfile: { creditLimit: Prisma.Decimal | null } | null;
      };
    },
  ) {
    const limit = invoice.businessPartner.customerProfile?.creditLimit;
    if (limit === null || limit === undefined) return;
    const rows = await db.$queryRaw<{ exposure: Prisma.Decimal }[]>(Prisma.sql`
      SELECT COALESCE(SUM(jl."debit" - jl."credit"), 0) AS exposure
      FROM "JournalLine" jl
      JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" AND je."companyId" = jl."companyId"
      JOIN "AccountingAccount" aa ON aa."id" = jl."accountId" AND aa."companyId" = jl."companyId"
      WHERE jl."companyId" = ${invoice.companyId}
        AND jl."businessPartnerId" = ${invoice.businessPartnerId}
        AND je."status" = 'POSTED'
        AND aa."accountType" = 'ASSET_RECEIVABLE'
    `);
    const existingExposure = rows[0]?.exposure ?? new Prisma.Decimal(0);
    const prospective = invoice.paymentSchedule.reduce(
      (total, schedule) =>
        total.add(
          schedule.amount
            .mul(invoice.exchangeRate)
            .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP),
        ),
      new Prisma.Decimal(0),
    );
    if (existingExposure.add(prospective).gt(limit)) {
      throw new ConflictException('sales.customer_credit_limit_exceeded');
    }
  }

  private async resolvePostingAccounts(
    db: Prisma.TransactionClient,
    companyId: string,
    invoice: any,
    mappedAccounts: Map<AccountingConfigAccountKey, string>,
  ) {
    const load = async (
      id: string | undefined,
      key: AccountingConfigAccountKey,
      expected: AccountingAccountType | AccountingAccountType[],
      control = false,
    ) => {
      if (!id) throw new ConflictException(`Missing ${key} account mapping`);
      const account = await db.accountingAccount.findFirst({
        where: { id, companyId },
      });
      if (!account || !account.isActive || !account.allowDirectPosting) {
        throw new ConflictException(`Invalid ${key} account mapping`);
      }
      try {
        assertAccountMappingCompatibility(key, account.accountType);
      } catch {
        throw new ConflictException(`Invalid ${key} account semantics`);
      }
      const expectedTypes = Array.isArray(expected) ? expected : [expected];
      if (
        !expectedTypes.includes(account.accountType) ||
        (control &&
          (!account.isControlAccount || !account.reconciliationEligible))
      ) {
        throw new ConflictException(`Invalid ${key} account semantics`);
      }
      return account;
    };
    const receivable = await load(
      (invoice.businessPartner.customerProfile?.receivableAccountId as
        | string
        | undefined) ??
        mappedAccounts.get(AccountingConfigAccountKey.RECEIVABLE),
      AccountingConfigAccountKey.RECEIVABLE,
      AccountingAccountType.ASSET_RECEIVABLE,
      true,
    );
    const revenue = await load(
      mappedAccounts.get(AccountingConfigAccountKey.INCOME),
      AccountingConfigAccountKey.INCOME,
      [
        AccountingAccountType.INCOME_OPERATING_REVENUE,
        AccountingAccountType.INCOME_OTHER,
      ],
    );
    let tax: Awaited<ReturnType<typeof load>> | null = null;
    if (invoice.lines.some((line: any) => line.taxAmount.gt(0))) {
      tax = await load(
        mappedAccounts.get(AccountingConfigAccountKey.TAX_PAYABLE),
        AccountingConfigAccountKey.TAX_PAYABLE,
        AccountingAccountType.LIABILITY_TAX,
      );
    }
    return { receivable, revenue, tax };
  }

  private async assertDraftStillCurrent(
    db: Prisma.TransactionClient,
    invoice: any,
    postingDate: Date,
    actorUserId: string,
  ) {
    const partner = await db.businessPartner.findFirst({
      where: { id: invoice.businessPartnerId, companyId: invoice.companyId },
      include: {
        addresses: {
          where: { isActive: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });
    const currentAddress = partner?.addresses[0] ?? null;
    if (
      !partner ||
      partner.partnerCode !== invoice.partnerCodeSnapshot ||
      partner.displayName !== invoice.partnerNameSnapshot ||
      partner.legalName !== invoice.partnerLegalNameSnapshot ||
      partner.taxRegistrationNumber !== invoice.taxRegistrationNumberSnapshot ||
      JSON.stringify(currentAddress) !==
        JSON.stringify(invoice.billingAddressSnapshot)
    ) {
      throw new ConflictException('sales.draft_requires_recalculation');
    }
    const taxPolicy = await this.loadCurrentTaxPolicy(
      db,
      String(invoice.companyId),
      actorUserId,
    );
    for (const line of invoice.lines) {
      const tax = line.taxes[0];
      if (!tax) continue;
      const treatment = tax.taxTreatmentId
        ? await db.taxTreatment.findFirst({
            where: { id: tax.taxTreatmentId, companyId: invoice.companyId },
          })
        : null;
      if (
        tax.taxTreatmentId &&
        (!treatment ||
          treatment.code !== tax.treatmentCodeSnapshot ||
          treatment.category !== tax.treatmentCategory ||
          treatment.status !== TaxLifecycleStatus.ACTIVE ||
          (treatment.effectiveFrom && postingDate < treatment.effectiveFrom) ||
          (treatment.effectiveTo && postingDate > treatment.effectiveTo))
      ) {
        throw new ConflictException('sales.draft_requires_recalculation');
      }
      const rate = tax.taxRateId
        ? await db.taxRate.findFirst({
            where: { id: tax.taxRateId, companyId: invoice.companyId },
          })
        : null;
      if (
        tax.taxRateId &&
        (!rate ||
          rate.treatmentId !== tax.taxTreatmentId ||
          rate.code !== tax.rateCodeSnapshot ||
          !rate.percentage.eq(String(tax.percentageSnapshot)) ||
          rate.status !== TaxLifecycleStatus.ACTIVE ||
          (rate.effectiveFrom && postingDate < rate.effectiveFrom) ||
          (rate.effectiveTo && postingDate > rate.effectiveTo))
      ) {
        throw new ConflictException('sales.draft_requires_recalculation');
      }

      let currentSelection;
      if (
        tax.selectionProvenance ===
        SalesTaxSelectionProvenance.EXPLICIT_OVERRIDE
      ) {
        if (!taxPolicy.moduleEnabled || !taxPolicy.allowManualOverride) {
          throw new ConflictException('sales.draft_requires_recalculation');
        }
        if (!taxPolicy.overrideAuthorized) {
          throw new ConflictException('sales.tax_override_forbidden');
        }
        const explicit = await this.loadExplicitTaxSelection(
          db,
          String(invoice.companyId),
          tax.taxTreatmentId ? String(tax.taxTreatmentId) : undefined,
          tax.taxRateId ? String(tax.taxRateId) : undefined,
        );
        currentSelection = this.tax.resolveTaxSelection({
          moduleEnabled: true,
          moduleDefault: null,
          companyDefault: null,
          explicit,
          allowManualOverride: true,
          overrideAuthorized: true,
        });
      } else if (
        tax.selectionProvenance ===
        SalesTaxSelectionProvenance.MODULE_DISABLED_OUT_OF_SCOPE
      ) {
        if (taxPolicy.moduleEnabled) {
          throw new ConflictException('sales.draft_requires_recalculation');
        }
        currentSelection = this.tax.resolveTaxSelection({
          moduleEnabled: false,
          moduleDefault: null,
          companyDefault: null,
          explicit: null,
          allowManualOverride: false,
          overrideAuthorized: false,
        });
      } else {
        currentSelection = this.tax.resolveTaxSelection({
          moduleEnabled: taxPolicy.moduleEnabled,
          moduleDefault: taxPolicy.moduleDefault,
          companyDefault: taxPolicy.companyDefault,
          explicit: null,
          allowManualOverride: taxPolicy.allowManualOverride,
          overrideAuthorized: taxPolicy.overrideAuthorized,
        });
      }
      if (
        currentSelection.selectionProvenance !== tax.selectionProvenance ||
        currentSelection.treatmentId !== tax.taxTreatmentId ||
        currentSelection.treatmentCode !== tax.treatmentCodeSnapshot ||
        currentSelection.treatmentCategory !== tax.treatmentCategory ||
        currentSelection.calculationMode !== tax.calculationMode ||
        (currentSelection.rate?.id ?? null) !== (tax.taxRateId ?? null) ||
        (currentSelection.rate?.code ?? null) !==
          (tax.rateCodeSnapshot ?? null) ||
        !new Prisma.Decimal(String(currentSelection.rate?.percentage ?? 0)).eq(
          String(tax.percentageSnapshot),
        )
      ) {
        throw new ConflictException('sales.draft_requires_recalculation');
      }
    }
    if (invoice.paymentTermId) {
      const term = await db.paymentTerm.findFirst({
        where: {
          id: invoice.paymentTermId,
          companyId: invoice.companyId,
          isActive: true,
        },
        include: { lines: { orderBy: { sequence: 'asc' } } },
      });
      const first = invoice.paymentSchedule[0];
      const currency = await db.currency.findFirst({
        where: { code: invoice.transactionCurrencyCode, isActive: true },
      });
      const expectedSchedule =
        term && currency
          ? PaymentTermsCalculator.calculate(
              new Prisma.Decimal(String(invoice.grandTotal)),
              new Date(String(invoice.documentDate)),
              term as PaymentTermWithLines,
              currency.minorUnitPrecision,
            )
          : [];
      if (
        !term ||
        !first ||
        first.paymentTermCodeSnapshot !== term.code ||
        first.paymentTermNameSnapshot !== term.name ||
        expectedSchedule.length !== invoice.paymentSchedule.length ||
        expectedSchedule.some(
          (expected, index) =>
            !expected.amount.eq(
              new Prisma.Decimal(String(invoice.paymentSchedule[index].amount)),
            ) ||
            expected.dueDate.toISOString().slice(0, 10) !==
              new Date(String(invoice.paymentSchedule[index].dueDate))
                .toISOString()
                .slice(0, 10),
        )
      ) {
        throw new ConflictException('sales.draft_requires_recalculation');
      }
    }
  }

  private assertPaymentSchedule(invoice: {
    paymentSchedule: Array<{ amount: Prisma.Decimal }>;
    grandTotal: Prisma.Decimal;
  }) {
    if (!invoice.paymentSchedule.length)
      throw new ConflictException('sales.payment_schedule_required');
    const sum = invoice.paymentSchedule.reduce(
      (total: Prisma.Decimal, row) => total.add(row.amount),
      new Prisma.Decimal(0),
    );
    if (
      !sum.eq(invoice.grandTotal) ||
      invoice.paymentSchedule.some((row) => row.amount.lte(0))
    ) {
      throw new ConflictException('sales.payment_schedule_invalid');
    }
  }

  private async allocateDocumentNumber(
    db: Prisma.TransactionClient,
    companyId: string,
    fiscalYearId: string,
    documentType: SalesDocumentType,
    fiscalYearStartDate: Date,
  ) {
    const rows = await db.$queryRaw<{ allocated: number }[]>(Prisma.sql`
      INSERT INTO "SalesDocumentSequence" ("id", "companyId", "fiscalYearId", "documentType", "nextValue", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${companyId}, ${fiscalYearId}, ${documentType}::"SalesDocumentType", 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("companyId", "fiscalYearId", "documentType")
      DO UPDATE SET "nextValue" = "SalesDocumentSequence"."nextValue" + 1,
                    "updatedAt" = CURRENT_TIMESTAMP
      RETURNING ("nextValue" - 1) AS "allocated"
    `);
    const allocated = rows[0]?.allocated;
    if (!allocated)
      throw new ConflictException('Unable to allocate sales document number');
    const prefix =
      documentType === SalesDocumentType.SALES_INVOICE ? 'SI' : 'CN';
    return `${prefix}-${fiscalYearStartDate.getUTCFullYear()}-${String(allocated).padStart(6, '0')}`;
  }

  private dateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private postingRequestHash(
    invoiceId: string,
    requestKey: string,
    postingDate: string,
  ) {
    return createHash('sha256')
      .update(`${invoiceId}:${requestKey}:${postingDate}`)
      .digest('hex');
  }
}

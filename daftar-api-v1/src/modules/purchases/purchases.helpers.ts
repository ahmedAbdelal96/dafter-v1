import {
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
  AccountingJournalType,
  Prisma,
  PurchaseAccountType,
  SalesDiscountType,
  TaxCalculationMode,
  TaxLifecycleStatus,
  TaxModuleKey,
  TaxTreatmentCategory,
} from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { assertAccountMappingCompatibility } from '../accounting/accounting-policies';

export const ZERO = new Prisma.Decimal(0);
export const FOUR = 4;

export type PurchaseLineInput = {
  productId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountType?: SalesDiscountType;
  discountValue?: string;
  taxRateId?: string;
  taxTreatmentId?: string;
  taxOverrideReason?: string;
  accountType?: PurchaseAccountType;
  expenseAccountId?: string;
  assetAccountId?: string;
};

export type CalculatedPurchaseLine = {
  productId?: string;
  descriptionSnapshot: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  discountType: SalesDiscountType;
  discountValue: Prisma.Decimal;
  grossBeforeDiscount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxableBase: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  accountType: PurchaseAccountType;
  expenseAccountId?: string;
  assetAccountId?: string;
  tax?: {
    taxTreatmentId?: string | null;
    taxRateId?: string | null;
    treatmentCodeSnapshot: string;
    treatmentCategory: TaxTreatmentCategory;
    rateCodeSnapshot?: string | null;
    percentageSnapshot: Prisma.Decimal;
    calculationMode: TaxCalculationMode;
    selectionProvenance:
      | 'MODULE_DEFAULT'
      | 'COMPANY_DEFAULT'
      | 'EXPLICIT_OVERRIDE'
      | 'MODULE_DISABLED_OUT_OF_SCOPE';
    overrideReasonSnapshot?: string | null;
    taxableBase: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    taxInputAccountId?: string | null;
  };
};

export type PurchaseTaxContext = {
  actorUserId?: string;
  asOf?: Date;
};

type PurchaseTaxSelection = {
  taxTreatmentId: string | null;
  taxRateId: string | null;
  treatmentCodeSnapshot: string;
  treatmentCategory: TaxTreatmentCategory;
  rateCodeSnapshot: string | null;
  percentageSnapshot: Prisma.Decimal;
  calculationMode: TaxCalculationMode;
  selectionProvenance:
    | 'MODULE_DEFAULT'
    | 'COMPANY_DEFAULT'
    | 'EXPLICIT_OVERRIDE'
    | 'MODULE_DISABLED_OUT_OF_SCOPE';
  overrideReasonSnapshot: string | null;
  taxInputAccountId?: string;
};

type TaxTreatmentLifecycle = {
  id: string;
  status: TaxLifecycleStatus;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
};

type TaxRateLifecycle = TaxTreatmentLifecycle & {
  treatmentId: string | null;
};

type TaxTreatmentRecord = TaxTreatmentLifecycle & {
  companyId: string;
  code: string;
  category: TaxTreatmentCategory;
  calculationMode: TaxCalculationMode;
};

type TaxRateRecord = TaxRateLifecycle & {
  companyId: string;
  code: string;
  percentage: Prisma.Decimal;
  treatment?: TaxTreatmentRecord | null;
};

export function lineCreateData(line: CalculatedPurchaseLine, index: number) {
  const { tax, ...data } = line;
  return {
    ...data,
    sequence: index + 1,
    taxes: tax ? { create: tax } : undefined,
  };
}

export function decimal(
  value: string | Prisma.Decimal | number,
  label: string,
) {
  const result = new Prisma.Decimal(value);
  if (!result.isFinite()) throw new BadRequestException(`${label} is invalid`);
  return result;
}

export function positive(value: Prisma.Decimal, label: string) {
  if (value.lte(ZERO))
    throw new BadRequestException(`${label} must be positive`);
}

export function dateOnly(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export async function partySnapshot(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
  partnerId: string,
) {
  const partner = await db.businessPartner.findFirst({
    where: {
      id: partnerId,
      companyId,
      isActive: true,
      supplierProfile: { isActive: true },
    },
    include: {
      supplierProfile: true,
      addresses: { where: { isActive: true, isDefault: true }, take: 1 },
    },
  });
  if (!partner || !partner.supplierProfile) {
    throw new BadRequestException(
      'A supplier BusinessPartner with an active SupplierProfile is required',
    );
  }
  return {
    partner,
    snapshot: {
      partnerCodeSnapshot: partner.partnerCode,
      partnerNameSnapshot: partner.displayName,
      partnerLegalNameSnapshot: partner.legalName ?? null,
      taxRegistrationNumberSnapshot: partner.taxRegistrationNumber ?? null,
      billingAddressSnapshot: partner.addresses[0] ?? null,
    },
  };
}

function inEffectiveWindow(
  asOf: Date,
  effectiveFrom: Date | null,
  effectiveTo: Date | null,
) {
  return (
    (!effectiveFrom || asOf >= effectiveFrom) &&
    (!effectiveTo || asOf <= effectiveTo)
  );
}

function assertTaxLifecycle(
  treatment: TaxTreatmentLifecycle | null | undefined,
  rate: TaxRateLifecycle | null | undefined,
  asOf: Date,
  explicit = false,
) {
  if (
    !treatment ||
    treatment.status !== TaxLifecycleStatus.ACTIVE ||
    !inEffectiveWindow(asOf, treatment.effectiveFrom, treatment.effectiveTo)
  )
    throw new ConflictException(
      explicit
        ? 'Purchase tax override is no longer valid'
        : 'Purchase tax policy requires recalculation',
    );
  if (
    rate &&
    (rate.status !== TaxLifecycleStatus.ACTIVE ||
      !inEffectiveWindow(asOf, rate.effectiveFrom, rate.effectiveTo))
  )
    throw new ConflictException(
      explicit
        ? 'Purchase tax override is no longer valid'
        : 'Purchase tax policy requires recalculation',
    );
  if (rate && rate.treatmentId !== treatment.id)
    throw new BadRequestException(
      'Purchase tax rate and treatment do not match',
    );
}

async function loadPurchaseTaxPolicy(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
  context: PurchaseTaxContext,
) {
  const asOf = context.asOf ?? new Date();
  const [rule, companyDefault, actor] = await Promise.all([
    db.taxModuleApplicabilityRule.findUnique({
      where: {
        companyId_moduleKey: { companyId, moduleKey: TaxModuleKey.PURCHASES },
      },
      include: { defaultRate: true, defaultTreatment: true },
    }),
    (db as any).taxDefaultPolicy?.findUnique?.({
      where: { companyId },
      include: { defaultRate: true, defaultTreatment: true },
    }),
    context.actorUserId
      ? db.user.findFirst({
          where: { id: context.actorUserId, companyId },
          include: { permissions: true },
        })
      : null,
  ]);
  const moduleEnabled = rule?.isEnabled ?? true;
  const allowManualOverride =
    (rule?.allowOverride ?? true) &&
    (companyDefault?.allowManualOverride ?? true);
  const overrideAuthorized =
    actor?.role === 'OWNER' ||
    actor?.role === 'SUPER_ADMIN' ||
    (actor?.permissions?.permissions as Record<string, unknown> | undefined)
      ?.overridePurchaseTax === true;
  const moduleDefault = rule?.defaultTreatment
    ? { treatment: rule.defaultTreatment, rate: rule.defaultRate }
    : null;
  const companySelection = companyDefault?.defaultTreatment
    ? {
        treatment: companyDefault.defaultTreatment,
        rate: companyDefault.defaultRate,
      }
    : null;
  for (const selection of [moduleDefault, companySelection]) {
    if (selection?.treatment && selection.treatment.companyId !== companyId)
      throw new BadRequestException('Purchase tax treatment company mismatch');
    if (selection?.rate && selection.rate.companyId !== companyId)
      throw new BadRequestException('Purchase tax rate company mismatch');
    if (
      selection?.rate &&
      selection.rate.treatmentId !== selection.treatment.id
    )
      throw new BadRequestException(
        'Purchase tax rate and treatment do not match',
      );
    if (selection?.treatment)
      assertTaxLifecycle(
        selection.treatment as TaxTreatmentRecord,
        selection.rate as TaxRateRecord | null,
        asOf,
      );
  }
  return {
    moduleEnabled,
    allowManualOverride,
    overrideAuthorized,
    moduleDefault,
    companySelection,
    asOf,
  };
}

async function resolveTaxSelection(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
  line: PurchaseLineInput,
  context: PurchaseTaxContext,
): Promise<PurchaseTaxSelection | undefined> {
  const policy = await loadPurchaseTaxPolicy(db, companyId, context);
  const explicit = Boolean(line.taxRateId || line.taxTreatmentId);
  if (!policy.moduleEnabled) {
    if (explicit)
      throw new ForbiddenException('Purchase tax override is forbidden');
    return undefined;
  }
  let treatment: TaxTreatmentRecord | null = null;
  let rate: TaxRateRecord | null = null;
  let provenance: PurchaseTaxSelection['selectionProvenance'];
  let reason: string | null = null;
  if (explicit) {
    if (!policy.allowManualOverride || !policy.overrideAuthorized)
      throw new ForbiddenException('Purchase tax override is forbidden');
    reason = line.taxOverrideReason?.trim() || null;
    if (!reason)
      throw new BadRequestException('Purchase tax override reason is required');
    rate = line.taxRateId
      ? await db.taxRate.findFirst({
          where: { id: line.taxRateId, companyId },
          include: { treatment: true },
        })
      : null;
    treatment = line.taxTreatmentId
      ? await db.taxTreatment.findFirst({
          where: { id: line.taxTreatmentId, companyId },
        })
      : (rate?.treatment ?? null);
    if (line.taxRateId && !rate)
      throw new BadRequestException('Purchase tax rate is invalid');
    if (!treatment)
      throw new BadRequestException('Purchase tax treatment is invalid');
    provenance = 'EXPLICIT_OVERRIDE';
  } else {
    const selected = policy.moduleDefault ?? policy.companySelection;
    if (!selected) return undefined;
    treatment = selected.treatment ?? null;
    rate = selected.rate ?? null;
    provenance = policy.moduleDefault ? 'MODULE_DEFAULT' : 'COMPANY_DEFAULT';
  }
  if (!treatment)
    throw new BadRequestException('Purchase tax treatment is invalid');
  assertTaxLifecycle(treatment, rate, policy.asOf, explicit);
  if (treatment.category === TaxTreatmentCategory.STANDARD && !rate)
    throw new BadRequestException('Purchase tax rate is required');

  const configured = await db.accountingConfiguration.findUnique({
    where: { companyId },
    include: { accountDefaults: true },
  });
  const mapping = configured?.accountDefaults.find(
    (x) => x.settingKey === AccountingConfigAccountKey.TAX_RECOVERABLE,
  );
  const account = mapping
    ? await db.accountingAccount.findFirst({
        where: { id: mapping.accountId, companyId, isActive: true },
      })
    : null;
  if (!mapping || !account || !account.allowDirectPosting)
    throw new BadRequestException(
      'TAX_RECOVERABLE mapping is missing or not postable',
    );
  assertAccountMappingCompatibility(
    AccountingConfigAccountKey.TAX_RECOVERABLE,
    account.accountType,
  );
  return {
    taxTreatmentId: treatment.id,
    taxRateId: rate?.id ?? null,
    treatmentCodeSnapshot: treatment.code,
    treatmentCategory: treatment.category,
    rateCodeSnapshot: rate?.code ?? null,
    percentageSnapshot: rate?.percentage ?? ZERO,
    calculationMode: treatment.calculationMode,
    selectionProvenance: provenance,
    overrideReasonSnapshot: reason,
    taxInputAccountId: account?.id,
  };
}

async function loadTaxRecoverableAccount(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
) {
  const configured = await db.accountingConfiguration.findUnique({
    where: { companyId },
    include: { accountDefaults: true },
  });
  const mapping = configured?.accountDefaults.find(
    (x) => x.settingKey === AccountingConfigAccountKey.TAX_RECOVERABLE,
  );
  const account = mapping
    ? await db.accountingAccount.findFirst({
        where: { id: mapping.accountId, companyId, isActive: true },
      })
    : null;
  if (!mapping || !account || !account.allowDirectPosting)
    throw new ConflictException(
      'Purchase draft requires TAX_RECOVERABLE recalculation',
    );
  assertAccountMappingCompatibility(
    AccountingConfigAccountKey.TAX_RECOVERABLE,
    account.accountType,
  );
  return account;
}

export async function assertPurchaseTaxSnapshots(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
  lines: Array<{
    taxes: Array<{
      taxTreatmentId: string | null;
      taxRateId: string | null;
      treatmentCodeSnapshot: string;
      treatmentCategory: TaxTreatmentCategory;
      rateCodeSnapshot: string | null;
      percentageSnapshot: Prisma.Decimal;
      calculationMode: TaxCalculationMode;
      selectionProvenance: string;
      overrideReasonSnapshot: string | null;
      taxInputAccountId: string | null;
    }>;
  }>,
  actorUserId: string,
  postingDate: Date,
) {
  const policy = await loadPurchaseTaxPolicy(db, companyId, {
    actorUserId,
    asOf: postingDate,
  });
  for (const line of lines) {
    for (const tax of line.taxes) {
      const treatment = tax.taxTreatmentId
        ? await db.taxTreatment.findFirst({
            where: { id: tax.taxTreatmentId, companyId },
          })
        : null;
      const rate = tax.taxRateId
        ? await db.taxRate.findFirst({
            where: { id: tax.taxRateId, companyId },
          })
        : null;
      try {
        assertTaxLifecycle(treatment, rate, postingDate);
      } catch {
        throw new ConflictException(
          'Purchase draft requires tax recalculation',
        );
      }
      if (tax.selectionProvenance === 'EXPLICIT_OVERRIDE') {
        if (!tax.overrideReasonSnapshot?.trim())
          throw new ConflictException(
            'Purchase tax override reason is required',
          );
        if (!policy.moduleEnabled || !policy.allowManualOverride)
          throw new ConflictException(
            'Purchase draft requires tax recalculation',
          );
        if (!policy.overrideAuthorized)
          throw new ForbiddenException('Purchase tax override is forbidden');
      } else if (tax.overrideReasonSnapshot?.trim()) {
        throw new ConflictException(
          'Purchase draft requires tax recalculation',
        );
      }
      const current =
        tax.selectionProvenance === 'EXPLICIT_OVERRIDE'
          ? { treatment, rate, provenance: 'EXPLICIT_OVERRIDE' }
          : policy.moduleEnabled
            ? {
                treatment:
                  (policy.moduleDefault ?? policy.companySelection)
                    ?.treatment ?? null,
                rate:
                  (policy.moduleDefault ?? policy.companySelection)?.rate ??
                  null,
                provenance: policy.moduleDefault
                  ? 'MODULE_DEFAULT'
                  : 'COMPANY_DEFAULT',
              }
            : {
                treatment: null,
                rate: null,
                provenance: 'MODULE_DISABLED_OUT_OF_SCOPE',
              };
      if (
        current.provenance !== tax.selectionProvenance ||
        (current.treatment?.id ?? null) !== tax.taxTreatmentId ||
        (current.treatment?.code ?? TaxTreatmentCategory.OUT_OF_SCOPE) !==
          tax.treatmentCodeSnapshot ||
        (current.treatment?.category ?? TaxTreatmentCategory.OUT_OF_SCOPE) !==
          tax.treatmentCategory ||
        (current.treatment?.calculationMode ??
          TaxCalculationMode.TAX_EXCLUSIVE) !== tax.calculationMode ||
        (current.rate?.id ?? null) !== tax.taxRateId ||
        (current.rate?.code ?? null) !== tax.rateCodeSnapshot ||
        !(current.rate?.percentage ?? ZERO).eq(tax.percentageSnapshot)
      ) {
        throw new ConflictException(
          'Purchase draft requires tax recalculation',
        );
      }
      const taxAccount = await loadTaxRecoverableAccount(db, companyId);
      if (tax.taxInputAccountId !== taxAccount.id)
        throw new ConflictException(
          'Purchase draft requires tax recalculation',
        );
    }
  }
}

export async function calculateLines(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
  inputs: PurchaseLineInput[],
  minorUnitPrecision = 2,
  context: PurchaseTaxContext = {},
) {
  if (!inputs.length)
    throw new BadRequestException('At least one purchase line is required');
  void minorUnitPrecision;
  const lines: CalculatedPurchaseLine[] = [];
  for (const input of inputs) {
    const quantity = decimal(input.quantity, 'Quantity');
    const unitPrice = decimal(input.unitPrice, 'Unit price');
    positive(quantity, 'Quantity');
    if (unitPrice.lt(ZERO))
      throw new BadRequestException('Unit price cannot be negative');
    const discountType = input.discountType ?? SalesDiscountType.NONE;
    const discountValue = decimal(input.discountValue ?? '0', 'Discount');
    if (discountValue.lt(ZERO))
      throw new BadRequestException('Discount cannot be negative');
    const gross = quantity
      .mul(unitPrice)
      .toDecimalPlaces(FOUR, Prisma.Decimal.ROUND_HALF_UP);
    const discount =
      discountType === SalesDiscountType.PERCENT
        ? gross.mul(discountValue).div(100)
        : discountType === SalesDiscountType.FIXED
          ? discountValue
          : ZERO;
    if (discount.gt(gross))
      throw new BadRequestException('Discount cannot exceed line gross amount');
    const taxableBase = gross
      .minus(discount)
      .toDecimalPlaces(FOUR, Prisma.Decimal.ROUND_HALF_UP);
    const tax = await resolveTaxSelection(db, companyId, input, context);
    let taxAmount = ZERO;
    let taxBase = taxableBase;
    if (tax && tax.percentageSnapshot.gt(ZERO)) {
      taxBase =
        tax.calculationMode === TaxCalculationMode.TAX_INCLUSIVE
          ? taxableBase.div(
              new Prisma.Decimal(1).plus(tax.percentageSnapshot.div(100)),
            )
          : taxableBase;
      taxAmount =
        tax.calculationMode === TaxCalculationMode.TAX_INCLUSIVE
          ? taxableBase.minus(taxBase)
          : taxableBase.mul(tax.percentageSnapshot).div(100);
      taxBase = taxBase.toDecimalPlaces(FOUR, Prisma.Decimal.ROUND_HALF_UP);
      taxAmount = taxAmount.toDecimalPlaces(FOUR, Prisma.Decimal.ROUND_HALF_UP);
    }
    const accountType = input.accountType ?? PurchaseAccountType.EXPENSE;
    let expenseAccountId = input.expenseAccountId;
    if (accountType === PurchaseAccountType.EXPENSE && !expenseAccountId) {
      const configuration = await db.accountingConfiguration.findUnique({
        where: { companyId },
        include: { accountDefaults: true },
      });
      const mapping = configuration?.accountDefaults.find(
        (item) => item.settingKey === AccountingConfigAccountKey.EXPENSE,
      );
      const fallback = mapping
        ? await db.accountingAccount.findFirst({
            where: { id: mapping.accountId, companyId, isActive: true },
          })
        : null;
      if (
        !fallback ||
        !['EXPENSE_OPERATING', 'EXPENSE_OTHER'].includes(fallback.accountType)
      ) {
        throw new BadRequestException(
          'Expense account is required or the default expense mapping is invalid',
        );
      }
      expenseAccountId = fallback.id;
    }
    if (accountType === PurchaseAccountType.ASSET && !input.assetAccountId) {
      throw new BadRequestException(
        'Asset account is required for asset purchase lines',
      );
    }
    lines.push({
      productId: input.productId,
      descriptionSnapshot: input.description.trim(),
      quantity,
      unitPrice,
      discountType,
      discountValue,
      grossBeforeDiscount: gross,
      discountAmount: discount.toDecimalPlaces(
        FOUR,
        Prisma.Decimal.ROUND_HALF_UP,
      ),
      taxableBase: taxBase,
      taxAmount,
      lineTotal:
        tax && tax.calculationMode === TaxCalculationMode.TAX_INCLUSIVE
          ? taxableBase
          : taxBase
              .plus(taxAmount)
              .toDecimalPlaces(FOUR, Prisma.Decimal.ROUND_HALF_UP),
      accountType,
      expenseAccountId,
      assetAccountId: input.assetAccountId,
      tax: tax ? { ...tax, taxableBase: taxBase, taxAmount } : undefined,
    });
  }
  return {
    lines,
    subtotal: lines
      .reduce((s, l) => s.plus(l.grossBeforeDiscount), ZERO)
      .toDecimalPlaces(FOUR),
    discountTotal: lines
      .reduce((s, l) => s.plus(l.discountAmount), ZERO)
      .toDecimalPlaces(FOUR),
    taxableBaseTotal: lines
      .reduce((s, l) => s.plus(l.taxableBase), ZERO)
      .toDecimalPlaces(FOUR),
    taxTotal: lines
      .reduce((s, l) => s.plus(l.taxAmount), ZERO)
      .toDecimalPlaces(FOUR),
    grandTotal: lines
      .reduce((s, l) => s.plus(l.lineTotal), ZERO)
      .toDecimalPlaces(FOUR),
  };
}

export async function assertAccounts(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
  lines: Array<{
    expenseAccountId?: string;
    assetAccountId?: string;
    accountType: PurchaseAccountType;
  }>,
) {
  const ids = lines
    .flatMap((l) => [l.expenseAccountId, l.assetAccountId])
    .filter(Boolean) as string[];
  if (!ids.length) return;
  const accounts = await db.accountingAccount.findMany({
    where: { companyId, id: { in: ids }, isActive: true },
  });
  if (accounts.length !== new Set(ids).size)
    throw new BadRequestException(
      'One or more purchase accounts are invalid or inactive',
    );
  for (const line of lines) {
    const id =
      line.accountType === PurchaseAccountType.EXPENSE
        ? line.expenseAccountId
        : line.assetAccountId;
    const account = accounts.find((a) => a.id === id);
    if (!account) continue;
    if (
      line.accountType === PurchaseAccountType.EXPENSE &&
      !['EXPENSE_OPERATING', 'EXPENSE_OTHER'].includes(account.accountType)
    ) {
      throw new BadRequestException(
        'Purchase expense lines must use an operating or other expense account',
      );
    }
    if (
      line.accountType === PurchaseAccountType.ASSET &&
      ![
        'ASSET_CURRENT',
        'ASSET_PREPAID',
        'ASSET_FIXED',
        'ASSET_OTHER',
      ].includes(account.accountType)
    ) {
      throw new BadRequestException(
        'Purchase asset lines must use an explicit non-inventory asset account',
      );
    }
  }
}

export async function accountingMappings(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
) {
  const config = await db.accountingConfiguration.findUnique({
    where: { companyId },
    include: { accountDefaults: true, journalDefaults: true },
  });
  if (!config)
    throw new BadRequestException('Accounting configuration is missing');
  const journalMapping = config.journalDefaults.find(
    (x) => x.settingKey === AccountingConfigJournalKey.PURCHASE,
  );
  if (!journalMapping)
    throw new BadRequestException('PURCHASE journal mapping is missing');
  const journal = await db.accountingJournal.findFirst({
    where: {
      id: journalMapping.journalId,
      companyId,
      type: AccountingJournalType.PURCHASE,
      isActive: true,
    },
  });
  if (!journal)
    throw new BadRequestException(
      'PURCHASE journal is missing, inactive, or has the wrong type',
    );
  const payableMapping = config.accountDefaults.find(
    (x) => x.settingKey === AccountingConfigAccountKey.PAYABLE,
  );
  if (!payableMapping)
    throw new BadRequestException('PAYABLE account mapping is missing');
  const payable = await db.accountingAccount.findFirst({
    where: { id: payableMapping.accountId, companyId, isActive: true },
  });
  if (
    !payable ||
    payable.accountType !== 'LIABILITY_PAYABLE' ||
    !payable.isControlAccount ||
    !payable.reconciliationEligible
  ) {
    throw new BadRequestException(
      'PAYABLE account mapping is not a valid reconciliation control account',
    );
  }
  return { config, journal, payable };
}

export async function nextValue(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
  kind: 'PO' | 'SI' | 'SCN',
  date: Date,
) {
  if (kind === 'PO') {
    const row = await db.purchaseOrderSequence.upsert({
      where: { companyId },
      create: { companyId, nextValue: 2 },
      update: { nextValue: { increment: 1 } },
    });
    return `PO-${String(row.nextValue - 1).padStart(6, '0')}`;
  }
  const fiscal = await db.fiscalYear.findFirst({
    where: {
      companyId,
      status: 'OPEN',
      startDate: { lte: dateOnly(date) },
      endDate: { gte: dateOnly(date) },
    },
  });
  if (!fiscal)
    throw new BadRequestException(
      'No open fiscal year covers the document date',
    );
  const type = kind === 'SI' ? 'SUPPLIER_INVOICE' : 'SUPPLIER_CREDIT_NOTE';
  const row = await db.supplierDocumentSequence.upsert({
    where: {
      companyId_fiscalYearId_documentType: {
        companyId,
        fiscalYearId: fiscal.id,
        documentType: type,
      },
    },
    create: {
      companyId,
      fiscalYearId: fiscal.id,
      documentType: type,
      nextValue: 2,
    },
    update: { nextValue: { increment: 1 } },
  });
  return `${kind}-${fiscal.startDate.getUTCFullYear()}-${String(row.nextValue - 1).padStart(6, '0')}`;
}

export function mapDuplicate(error: unknown): never | void {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new ConflictException(
      'Supplier document reference or number already exists',
    );
  }
}

import {
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
  AccountingJournalType,
  Prisma,
  PurchaseAccountType,
  SalesDiscountType,
  TaxCalculationMode,
  TaxModuleKey,
  TaxTreatmentCategory,
} from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

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
    taxTreatmentId?: string;
    taxRateId?: string;
    treatmentCodeSnapshot: string;
    treatmentCategory: TaxTreatmentCategory;
    rateCodeSnapshot?: string;
    percentageSnapshot: Prisma.Decimal;
    calculationMode: TaxCalculationMode;
    taxableBase: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    taxInputAccountId?: string;
  };
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
    where: { id: partnerId, companyId, isActive: true },
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

async function resolveTax(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
  line: PurchaseLineInput,
) {
  let rule = await db.taxModuleApplicabilityRule.findUnique({
    where: {
      companyId_moduleKey: { companyId, moduleKey: TaxModuleKey.PURCHASES },
    },
    include: { defaultRate: true, defaultTreatment: true },
  });
  if (rule && !rule.isEnabled && (line.taxRateId || line.taxTreatmentId)) {
    throw new BadRequestException(
      'Purchase tax module is disabled for this company',
    );
  }
  const rateId = line.taxRateId ?? rule?.defaultRateId ?? undefined;
  const treatmentId =
    line.taxTreatmentId ?? rule?.defaultTreatmentId ?? undefined;
  if (!rateId && !treatmentId) return undefined;
  const rate = rateId
    ? await db.taxRate.findFirst({
        where: { id: rateId, companyId, status: 'ACTIVE' },
      })
    : null;
  const treatment = treatmentId
    ? await db.taxTreatment.findFirst({
        where: { id: treatmentId, companyId, status: 'ACTIVE' },
      })
    : rate?.treatmentId
      ? await db.taxTreatment.findFirst({
          where: { id: rate.treatmentId, companyId, status: 'ACTIVE' },
        })
      : null;
  if (!rate && rateId)
    throw new BadRequestException(
      'Purchase tax rate was not found or is inactive',
    );
  if (!treatment)
    throw new BadRequestException(
      'Purchase tax treatment was not found or is inactive',
    );
  const binding = await db.taxAccountBinding.findUnique({
    where: { companyId },
  });
  const configured = await db.accountingConfiguration.findUnique({
    where: { companyId },
    include: { accountDefaults: true },
  });
  const mapping = configured?.accountDefaults.find(
    (x) => x.settingKey === AccountingConfigAccountKey.TAX_RECOVERABLE,
  );
  const account = binding?.inputTaxAccountCode
    ? await db.accountingAccount.findFirst({
        where: { companyId, code: binding.inputTaxAccountCode, isActive: true },
      })
    : mapping
      ? await db.accountingAccount.findFirst({
          where: { id: mapping.accountId, companyId, isActive: true },
        })
      : null;
  return {
    taxTreatmentId: treatment.id,
    taxRateId: rate?.id,
    treatmentCodeSnapshot: treatment.code,
    treatmentCategory: treatment.category,
    rateCodeSnapshot: rate?.code,
    percentageSnapshot: rate?.percentage ?? ZERO,
    calculationMode: treatment.calculationMode,
    taxInputAccountId: account?.id,
  };
}

export async function calculateLines(
  db: PrismaService | Prisma.TransactionClient,
  companyId: string,
  inputs: PurchaseLineInput[],
  minorUnitPrecision = 2,
) {
  if (!inputs.length)
    throw new BadRequestException('At least one purchase line is required');
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
    const tax = await resolveTax(db, companyId, input);
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

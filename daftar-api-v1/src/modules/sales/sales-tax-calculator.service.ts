import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  Prisma,
  TaxCalculationMode,
  TaxLifecycleStatus,
  TaxTreatmentCategory,
} from '@prisma/client';

export const SalesTaxSelectionProvenance = {
  MODULE_DEFAULT: 'MODULE_DEFAULT',
  COMPANY_DEFAULT: 'COMPANY_DEFAULT',
  EXPLICIT_OVERRIDE: 'EXPLICIT_OVERRIDE',
  MODULE_DISABLED_OUT_OF_SCOPE: 'MODULE_DISABLED_OUT_OF_SCOPE',
} as const;
export type SalesTaxSelectionProvenance =
  (typeof SalesTaxSelectionProvenance)[keyof typeof SalesTaxSelectionProvenance];

export interface SalesTaxRateSnapshot {
  id: string;
  code: string;
  percentage: Prisma.Decimal.Value;
  status: TaxLifecycleStatus;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
}

export interface SalesTaxSelection {
  rate: SalesTaxRateSnapshot | null;
  treatmentId?: string | null;
  treatmentCode: string;
  treatmentCategory: TaxTreatmentCategory;
  calculationMode: TaxCalculationMode;
  treatmentStatus?: TaxLifecycleStatus;
  treatmentEffectiveFrom?: Date | null;
  treatmentEffectiveTo?: Date | null;
  selectionProvenance?: SalesTaxSelectionProvenance;
}

export interface SalesTaxInput extends SalesTaxSelection {
  enteredAmount: Prisma.Decimal.Value;
  asOf: Date;
  currencyPrecision: number;
}

export interface SalesTaxResult {
  selectionProvenance: SalesTaxSelectionProvenance;
  treatmentId: string | null;
  treatmentCode: string;
  treatmentCategory: TaxTreatmentCategory;
  rateId: string | null;
  rateCode: string | null;
  percentage: Prisma.Decimal;
  calculationMode: TaxCalculationMode;
  taxableBase: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  grossAmount: Prisma.Decimal;
}

export interface SalesTaxSelectionInput {
  moduleEnabled: boolean;
  moduleDefault: SalesTaxSelection | null;
  companyDefault: SalesTaxSelection | null;
  explicit: SalesTaxSelection | null;
  allowManualOverride: boolean;
  overrideAuthorized: boolean;
}

@Injectable()
export class SalesTaxCalculatorService {
  resolveTaxSelection(input: SalesTaxSelectionInput): SalesTaxSelection {
    if (!input.moduleEnabled) {
      return {
        rate: null,
        treatmentId: null,
        treatmentCode: TaxTreatmentCategory.OUT_OF_SCOPE,
        treatmentCategory: TaxTreatmentCategory.OUT_OF_SCOPE,
        calculationMode: TaxCalculationMode.TAX_EXCLUSIVE,
        selectionProvenance:
          SalesTaxSelectionProvenance.MODULE_DISABLED_OUT_OF_SCOPE,
      };
    }

    if (input.explicit) {
      if (!input.allowManualOverride || !input.overrideAuthorized) {
        throw new ForbiddenException('sales.tax_override_forbidden');
      }
      return {
        ...input.explicit,
        selectionProvenance: SalesTaxSelectionProvenance.EXPLICIT_OVERRIDE,
      };
    }

    if (input.moduleDefault) {
      return {
        ...input.moduleDefault,
        selectionProvenance: SalesTaxSelectionProvenance.MODULE_DEFAULT,
      };
    }
    if (input.companyDefault) {
      return {
        ...input.companyDefault,
        selectionProvenance: SalesTaxSelectionProvenance.COMPANY_DEFAULT,
      };
    }
    return {
      rate: null,
      treatmentId: null,
      treatmentCode: TaxTreatmentCategory.OUT_OF_SCOPE,
      treatmentCategory: TaxTreatmentCategory.OUT_OF_SCOPE,
      calculationMode: TaxCalculationMode.TAX_EXCLUSIVE,
      selectionProvenance: SalesTaxSelectionProvenance.COMPANY_DEFAULT,
    };
  }

  calculateTax(input: SalesTaxInput): SalesTaxResult {
    if (
      !Number.isInteger(input.currencyPrecision) ||
      input.currencyPrecision < 0 ||
      input.currencyPrecision > 8
    ) {
      throw new BadRequestException('sales.currency_precision_invalid');
    }

    const enteredAmount = new Prisma.Decimal(input.enteredAmount);
    if (enteredAmount.lt(0)) {
      throw new BadRequestException('sales.taxable_amount_invalid');
    }

    const isZeroTaxTreatment =
      input.treatmentCategory === TaxTreatmentCategory.ZERO_RATED ||
      input.treatmentCategory === TaxTreatmentCategory.EXEMPT ||
      input.treatmentCategory === TaxTreatmentCategory.OUT_OF_SCOPE;

    this.assertTreatmentIsUsable(input);
    if (!isZeroTaxTreatment) {
      if (!input.rate) {
        throw new BadRequestException('sales.tax_rate_required');
      }
      this.assertRateIsUsable(input.rate, input.asOf);
    }

    const percentage = input.rate
      ? new Prisma.Decimal(input.rate.percentage)
      : new Prisma.Decimal(0);
    const taxableBase =
      input.calculationMode === TaxCalculationMode.TAX_INCLUSIVE
        ? this.money(
            enteredAmount.div(new Prisma.Decimal(1).add(percentage.div(100))),
            input.currencyPrecision,
          )
        : this.money(enteredAmount, input.currencyPrecision);
    const taxAmount = isZeroTaxTreatment
      ? new Prisma.Decimal(0).toDecimalPlaces(input.currencyPrecision)
      : this.money(
          taxableBase.mul(percentage).div(100),
          input.currencyPrecision,
        );
    const grossAmount =
      input.calculationMode === TaxCalculationMode.TAX_INCLUSIVE
        ? this.money(enteredAmount, input.currencyPrecision)
        : this.money(taxableBase.add(taxAmount), input.currencyPrecision);

    return {
      selectionProvenance:
        input.selectionProvenance ??
        SalesTaxSelectionProvenance.COMPANY_DEFAULT,
      treatmentId: input.treatmentId ?? null,
      treatmentCode: input.treatmentCode,
      treatmentCategory: input.treatmentCategory,
      rateId: input.rate?.id ?? null,
      rateCode: input.rate?.code ?? null,
      percentage,
      calculationMode: input.calculationMode,
      taxableBase,
      taxAmount,
      grossAmount,
    };
  }

  private assertRateIsUsable(rate: SalesTaxRateSnapshot, asOf: Date): void {
    if (rate.status !== TaxLifecycleStatus.ACTIVE) {
      throw new BadRequestException('sales.tax_rate_inactive');
    }
    if (rate.effectiveFrom && asOf < rate.effectiveFrom) {
      throw new BadRequestException('sales.tax_rate_not_effective');
    }
    if (rate.effectiveTo && asOf > rate.effectiveTo) {
      throw new BadRequestException('sales.tax_rate_expired');
    }
  }

  private assertTreatmentIsUsable(input: SalesTaxInput): void {
    if (!input.treatmentId) return;
    if (input.treatmentStatus !== TaxLifecycleStatus.ACTIVE) {
      throw new BadRequestException('sales.tax_treatment_inactive');
    }
    if (
      input.treatmentEffectiveFrom &&
      input.asOf < input.treatmentEffectiveFrom
    ) {
      throw new BadRequestException('sales.tax_treatment_not_effective');
    }
    if (input.treatmentEffectiveTo && input.asOf > input.treatmentEffectiveTo) {
      throw new BadRequestException('sales.tax_treatment_expired');
    }
  }

  private money(value: Prisma.Decimal, precision: number): Prisma.Decimal {
    return value.toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
  }
}

import { Prisma, TaxCalculationMode, TaxLifecycleStatus, TaxTreatmentCategory } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SalesTaxCalculatorService } from './sales-tax-calculator.service';

describe('SalesTaxCalculatorService', () => {
  const service = new SalesTaxCalculatorService();
  const validRate = {
    id: 'rate-id',
    code: 'VAT14',
    percentage: new Prisma.Decimal('14'),
    status: TaxLifecycleStatus.ACTIVE,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
  };

  it('calculates tax-exclusive STANDARD tax', () => {
    const result = service.calculateTax({
      enteredAmount: '100.00',
      rate: validRate,
      treatmentCode: 'STANDARD',
      treatmentCategory: TaxTreatmentCategory.STANDARD,
      calculationMode: TaxCalculationMode.TAX_EXCLUSIVE,
      asOf: new Date('2026-10-10T00:00:00.000Z'),
      currencyPrecision: 2,
    });

    expect(result.taxableBase).toEqual(new Prisma.Decimal('100.00'));
    expect(result.taxAmount).toEqual(new Prisma.Decimal('14.00'));
    expect(result.grossAmount).toEqual(new Prisma.Decimal('114.00'));
  });

  it('backs tax out of a tax-inclusive gross amount', () => {
    const result = service.calculateTax({
      enteredAmount: '114.00',
      rate: validRate,
      treatmentCode: 'STANDARD',
      treatmentCategory: TaxTreatmentCategory.STANDARD,
      calculationMode: TaxCalculationMode.TAX_INCLUSIVE,
      asOf: new Date('2026-10-10T00:00:00.000Z'),
      currencyPrecision: 2,
    });

    expect(result.taxableBase).toEqual(new Prisma.Decimal('100.00'));
    expect(result.taxAmount).toEqual(new Prisma.Decimal('14.00'));
    expect(result.grossAmount).toEqual(new Prisma.Decimal('114.00'));
  });

  it.each([
    TaxTreatmentCategory.ZERO_RATED,
    TaxTreatmentCategory.EXEMPT,
    TaxTreatmentCategory.OUT_OF_SCOPE,
  ])('keeps %s treatment identity when tax is zero', (category) => {
    const result = service.calculateTax({
      enteredAmount: '100.00',
      rate: null,
      treatmentCode: category,
      treatmentCategory: category,
      calculationMode: TaxCalculationMode.TAX_EXCLUSIVE,
      asOf: new Date('2026-10-10T00:00:00.000Z'),
      currencyPrecision: 2,
    });

    expect(result.treatmentCategory).toBe(category);
    expect(result.taxAmount).toEqual(new Prisma.Decimal('0.00'));
    expect(result.grossAmount).toEqual(new Prisma.Decimal('100.00'));
  });

  it('rejects inactive, future, and expired rates', () => {
    expect(() => service.calculateTax({
      enteredAmount: '100', rate: { ...validRate, status: TaxLifecycleStatus.INACTIVE }, treatmentCode: 'STANDARD', treatmentCategory: TaxTreatmentCategory.STANDARD,
      calculationMode: TaxCalculationMode.TAX_EXCLUSIVE, asOf: new Date('2026-10-10'), currencyPrecision: 2,
    })).toThrow(BadRequestException);
    expect(() => service.calculateTax({
      enteredAmount: '100', rate: { ...validRate, effectiveFrom: new Date('2027-01-01') }, treatmentCode: 'STANDARD', treatmentCategory: TaxTreatmentCategory.STANDARD,
      calculationMode: TaxCalculationMode.TAX_EXCLUSIVE, asOf: new Date('2026-10-10'), currencyPrecision: 2,
    })).toThrow(BadRequestException);
    expect(() => service.calculateTax({
      enteredAmount: '100', rate: { ...validRate, effectiveTo: new Date('2026-09-01') }, treatmentCode: 'STANDARD', treatmentCategory: TaxTreatmentCategory.STANDARD,
      calculationMode: TaxCalculationMode.TAX_EXCLUSIVE, asOf: new Date('2026-10-10'), currencyPrecision: 2,
    })).toThrow(BadRequestException);
  });

  it('rejects an unauthorized manual override', () => {
    expect(() => service.resolveTaxSelection({
      moduleEnabled: true,
      moduleDefault: { rate: validRate, treatmentCode: 'STANDARD', treatmentCategory: TaxTreatmentCategory.STANDARD, calculationMode: TaxCalculationMode.TAX_EXCLUSIVE },
      companyDefault: null,
      explicit: { rate: validRate, treatmentCode: 'STANDARD', treatmentCategory: TaxTreatmentCategory.STANDARD, calculationMode: TaxCalculationMode.TAX_EXCLUSIVE },
      allowManualOverride: false,
      overrideAuthorized: false,
    })).toThrow(ForbiddenException);
  });
});

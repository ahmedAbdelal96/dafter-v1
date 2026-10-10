import { Prisma } from '@prisma/client';
import { SalesPricingService } from './sales-pricing.service';

describe('SalesPricingService', () => {
  const service = new SalesPricingService();

  it('calculates a percentage discount with Decimal values', () => {
    const result = service.calculateLine({
      quantity: '2.5',
      unitPrice: '100.00',
      discount: { type: 'PERCENT', value: '10' },
      currencyPrecision: 2,
    });

    expect(result.grossBeforeDiscount).toEqual(new Prisma.Decimal('250.00'));
    expect(result.discountAmount).toEqual(new Prisma.Decimal('25.00'));
    expect(result.taxableBase).toEqual(new Prisma.Decimal('225.00'));
  });

  it('calculates a fixed discount without binary floating arithmetic', () => {
    const result = service.calculateLine({
      quantity: '3',
      unitPrice: '19.99',
      discount: { type: 'FIXED', value: '5.55' },
      currencyPrecision: 2,
    });

    expect(result.grossBeforeDiscount).toEqual(new Prisma.Decimal('59.97'));
    expect(result.discountAmount).toEqual(new Prisma.Decimal('5.55'));
    expect(result.taxableBase).toEqual(new Prisma.Decimal('54.42'));
  });

  it('represents no discount as an explicit zero', () => {
    const result = service.calculateLine({
      quantity: '1',
      unitPrice: '100',
      discount: { type: 'NONE', value: '0' },
      currencyPrecision: 2,
    });

    expect(result.discountAmount).toEqual(new Prisma.Decimal('0.00'));
    expect(result.taxableBase).toEqual(new Prisma.Decimal('100.00'));
  });
});

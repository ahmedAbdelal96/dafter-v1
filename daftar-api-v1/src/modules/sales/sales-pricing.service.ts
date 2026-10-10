import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type SalesDiscountTypeInput = 'NONE' | 'PERCENT' | 'FIXED';

export interface SalesPricingInput {
  quantity: Prisma.Decimal.Value;
  unitPrice: Prisma.Decimal.Value;
  discount: {
    type: SalesDiscountTypeInput;
    value: Prisma.Decimal.Value;
  };
  currencyPrecision: number;
}

export interface SalesPricingResult {
  grossBeforeDiscount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxableBase: Prisma.Decimal;
}

@Injectable()
export class SalesPricingService {
  calculateLine(input: SalesPricingInput): SalesPricingResult {
    const quantity = new Prisma.Decimal(input.quantity);
    const unitPrice = new Prisma.Decimal(input.unitPrice);
    const discountValue = new Prisma.Decimal(input.discount.value);

    if (!Number.isInteger(input.currencyPrecision) || input.currencyPrecision < 0 || input.currencyPrecision > 8) {
      throw new BadRequestException('sales.currency_precision_invalid');
    }
    if (!quantity.gt(0) || unitPrice.lt(0) || discountValue.lt(0)) {
      throw new BadRequestException('sales.pricing_values_invalid');
    }

    const grossBeforeDiscount = this.money(quantity.mul(unitPrice), input.currencyPrecision);
    let discountAmount: Prisma.Decimal;
    switch (input.discount.type) {
      case 'NONE':
        discountAmount = new Prisma.Decimal(0);
        break;
      case 'PERCENT':
        if (discountValue.gt(100)) {
          throw new BadRequestException('sales.discount_percent_invalid');
        }
        discountAmount = this.money(grossBeforeDiscount.mul(discountValue).div(100), input.currencyPrecision);
        break;
      case 'FIXED':
        if (discountValue.gt(grossBeforeDiscount)) {
          throw new BadRequestException('sales.discount_exceeds_gross');
        }
        discountAmount = this.money(discountValue, input.currencyPrecision);
        break;
      default:
        throw new BadRequestException('sales.discount_type_invalid');
    }

    return {
      grossBeforeDiscount,
      discountAmount,
      taxableBase: this.money(grossBeforeDiscount.sub(discountAmount), input.currencyPrecision),
    };
  }

  private money(value: Prisma.Decimal, precision: number): Prisma.Decimal {
    return value.toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
  }
}

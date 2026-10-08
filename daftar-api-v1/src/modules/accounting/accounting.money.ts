import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const ACCOUNTING_MONEY_SCALE = 4;

/**
 * The only money boundary used by the authoritative accounting domain.
 * Inputs are intentionally strings so JSON floating-point values cannot enter
 * the posting engine unnoticed.
 */
export class AccountingMoney {
  private constructor(readonly value: Prisma.Decimal) {}

  static fromString(
    input: string,
    field = 'amount',
    scale = ACCOUNTING_MONEY_SCALE,
  ): AccountingMoney {
    if (
      typeof input !== 'string' ||
      !/^-?(?:\d+)(?:\.\d+)?$/.test(input.trim())
    ) {
      throw new BadRequestException(`Invalid accounting decimal for ${field}`);
    }

    const value = new Prisma.Decimal(input.trim());
    if (!value.isFinite() || value.isNaN()) {
      throw new BadRequestException(`Invalid accounting decimal for ${field}`);
    }

    if (!value.eq(value.toDecimalPlaces(scale))) {
      throw new BadRequestException(
        `${field} supports at most ${scale} decimal places`,
      );
    }

    return new AccountingMoney(value);
  }

  static zero(): AccountingMoney {
    return new AccountingMoney(new Prisma.Decimal(0));
  }

  add(other: AccountingMoney): AccountingMoney {
    return new AccountingMoney(this.value.add(other.value));
  }

  sub(other: AccountingMoney): AccountingMoney {
    return new AccountingMoney(this.value.sub(other.value));
  }

  neg(): AccountingMoney {
    return new AccountingMoney(this.value.neg());
  }

  multiply(other: AccountingMoney): AccountingMoney {
    return new AccountingMoney(this.value.mul(other.value));
  }

  round(scale: number): AccountingMoney {
    return new AccountingMoney(
      this.value.toDecimalPlaces(scale, Prisma.Decimal.ROUND_HALF_UP),
    );
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.gt(0);
  }

  isNegative(): boolean {
    return this.value.lt(0);
  }

  eq(other: AccountingMoney): boolean {
    return this.value.eq(other.value);
  }

  toDecimal(): Prisma.Decimal {
    return this.value;
  }

  toString(): string {
    return this.value.toFixed(ACCOUNTING_MONEY_SCALE);
  }
}

import { Prisma } from '@prisma/client';
import { convertAndAllocateBaseCurrency } from './accounting-conversion';

describe('base-currency conversion and residual allocation', () => {
  it('uses the same authoritative conversion for split receivables and preserves transaction amounts', () => {
    const result = convertAndAllocateBaseCurrency(
      [
        {
          accountId: 'ar',
          transactionDebit: new Prisma.Decimal('34'),
          transactionCredit: new Prisma.Decimal('0'),
        },
        {
          accountId: 'ar',
          transactionDebit: new Prisma.Decimal('33'),
          transactionCredit: new Prisma.Decimal('0'),
        },
        {
          accountId: 'ar',
          transactionDebit: new Prisma.Decimal('33'),
          transactionCredit: new Prisma.Decimal('0'),
        },
        {
          accountId: 'revenue',
          transactionDebit: new Prisma.Decimal('0'),
          transactionCredit: new Prisma.Decimal('100'),
        },
      ],
      new Prisma.Decimal('33.33333333'),
    );

    expect(result.transactionDebitTotal.toString()).toBe('100');
    expect(result.transactionCreditTotal.toString()).toBe('100');
    expect(
      result.lines.map((line) => line.transactionDebit.toString()),
    ).toEqual(['34', '33', '33', '0']);
    expect(result.debitTotal.toFixed(4)).toBe(result.creditTotal.toFixed(4));
    expect(
      result.lines
        .filter((line) => line.accountId === 'ar')
        .reduce(
          (total, line) => total.add(line.debit).sub(line.credit),
          new Prisma.Decimal(0),
        )
        .toFixed(4),
    ).toBe(result.debitTotal.toFixed(4));
  });

  it('keeps an exact limit equal to the final authoritative exposure and rejects 0.0001 overage at the caller boundary', () => {
    const exact = convertAndAllocateBaseCurrency(
      [
        {
          accountId: 'ar',
          transactionDebit: new Prisma.Decimal('100'),
          transactionCredit: new Prisma.Decimal('0'),
        },
        {
          accountId: 'revenue',
          transactionDebit: new Prisma.Decimal('0'),
          transactionCredit: new Prisma.Decimal('100'),
        },
      ],
      new Prisma.Decimal('30'),
    );
    const over = convertAndAllocateBaseCurrency(
      [
        {
          accountId: 'ar',
          transactionDebit: new Prisma.Decimal('100'),
          transactionCredit: new Prisma.Decimal('0'),
        },
        {
          accountId: 'revenue',
          transactionDebit: new Prisma.Decimal('0'),
          transactionCredit: new Prisma.Decimal('100'),
        },
      ],
      new Prisma.Decimal('30.000001'),
    );
    const exactExposure = exact.lines[0].debit;
    const overExposure = over.lines[0].debit;
    expect(exactExposure.toFixed(4)).toBe('3000.0000');
    expect(overExposure.sub(exactExposure).toFixed(4)).toBe('0.0001');
    expect(overExposure.gt(exactExposure)).toBe(true);
  });
});

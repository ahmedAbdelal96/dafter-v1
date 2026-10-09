import { Prisma, PaymentTermLineType } from '@prisma/client';
import {
  PaymentTermsCalculator,
  PaymentTermWithLines,
} from './payment-terms.calculator';

const term = (
  lines: Array<{
    sequence: number;
    calculationType: PaymentTermLineType;
    percentage?: string;
    dueDays: number;
  }>,
): PaymentTermWithLines => ({
  lines: lines.map((line) => ({
    ...line,
    percentage:
      line.percentage === undefined
        ? null
        : new Prisma.Decimal(line.percentage),
  })),
});

describe('PaymentTermsCalculator', () => {
  it('calculates immediate payment and net 30 due dates', () => {
    const immediate = PaymentTermsCalculator.calculate(
      '100.00',
      new Date('2026-01-31T00:00:00.000Z'),
      term([
        {
          sequence: 1,
          calculationType: PaymentTermLineType.BALANCE,
          dueDays: 0,
        },
      ]),
      2,
    );
    const net30 = PaymentTermsCalculator.calculate(
      '100.00',
      new Date('2026-01-31T00:00:00.000Z'),
      term([
        {
          sequence: 1,
          calculationType: PaymentTermLineType.BALANCE,
          dueDays: 30,
        },
      ]),
      2,
    );

    expect(immediate[0].amount.toString()).toBe('100');
    expect(immediate[0].dueDate.toISOString()).toBe('2026-01-31T00:00:00.000Z');
    expect(net30[0].dueDate.toISOString()).toBe('2026-03-02T00:00:00.000Z');
  });

  it('allocates 50/50 and percentage plus balance exactly', () => {
    const split = PaymentTermsCalculator.calculate(
      '100.00',
      new Date('2026-02-01T00:00:00.000Z'),
      term([
        {
          sequence: 1,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '50',
          dueDays: 0,
        },
        {
          sequence: 2,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '50',
          dueDays: 30,
        },
      ]),
      2,
    );
    const remainder = PaymentTermsCalculator.calculate(
      '100.00',
      new Date('2026-02-01T00:00:00.000Z'),
      term([
        {
          sequence: 1,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '30',
          dueDays: 0,
        },
        {
          sequence: 2,
          calculationType: PaymentTermLineType.BALANCE,
          dueDays: 30,
        },
      ]),
      2,
    );

    expect(split.map((line) => line.amount.toString())).toEqual(['50', '50']);
    expect(remainder.map((line) => line.amount.toString())).toEqual([
      '30',
      '70',
    ]);
  });

  it('uses the final line remainder for thirds and preserves the exact total', () => {
    const result = PaymentTermsCalculator.calculate(
      '100.00',
      new Date('2026-01-31T00:00:00.000Z'),
      term([
        {
          sequence: 1,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '33.3333',
          dueDays: 0,
        },
        {
          sequence: 2,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '33.3333',
          dueDays: 30,
        },
        {
          sequence: 3,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '33.3334',
          dueDays: 60,
        },
      ]),
      2,
    );

    expect(result.map((line) => line.amount.toString())).toEqual([
      '33.33',
      '33.33',
      '33.34',
    ]);
    expect(
      result
        .reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0))
        .toString(),
    ).toBe('100');
  });

  it.each([
    [
      'zero amount',
      '0',
      [
        {
          sequence: 1,
          calculationType: PaymentTermLineType.BALANCE,
          dueDays: 0,
        },
      ],
    ],
    [
      'negative amount',
      '-1',
      [
        {
          sequence: 1,
          calculationType: PaymentTermLineType.BALANCE,
          dueDays: 0,
        },
      ],
    ],
    [
      'over-allocation',
      '100',
      [
        {
          sequence: 1,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '80',
          dueDays: 0,
        },
        {
          sequence: 2,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '30',
          dueDays: 30,
        },
      ],
    ],
    [
      'invalid ordering',
      '100',
      [
        {
          sequence: 2,
          calculationType: PaymentTermLineType.BALANCE,
          dueDays: 0,
        },
        {
          sequence: 1,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '100',
          dueDays: 30,
        },
      ],
    ],
  ])('rejects %s', (_name, amount, lines) => {
    expect(() =>
      PaymentTermsCalculator.calculate(
        amount,
        new Date('2026-01-31T00:00:00.000Z'),
        term(
          lines as Array<{
            sequence: number;
            calculationType: PaymentTermLineType;
            percentage?: string;
            dueDays: number;
          }>,
        ),
        2,
      ),
    ).toThrow();
  });

  it('rejects a balance line before a percentage line and decreasing due dates', () => {
    expect(() =>
      PaymentTermsCalculator.calculate(
        '100',
        new Date('2026-01-31T00:00:00.000Z'),
        term([
          {
            sequence: 1,
            calculationType: PaymentTermLineType.BALANCE,
            dueDays: 0,
          },
          {
            sequence: 2,
            calculationType: PaymentTermLineType.PERCENT,
            percentage: '10',
            dueDays: 30,
          },
        ]),
        2,
      ),
    ).toThrow();
    expect(() =>
      PaymentTermsCalculator.calculate(
        '100',
        new Date('2026-01-31T00:00:00.000Z'),
        term([
          {
            sequence: 1,
            calculationType: PaymentTermLineType.PERCENT,
            percentage: '50',
            dueDays: 30,
          },
          {
            sequence: 2,
            calculationType: PaymentTermLineType.BALANCE,
            dueDays: 0,
          },
        ]),
        2,
      ),
    ).toThrow();
  });
});

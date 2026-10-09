import { PaymentTermLineType, Prisma } from '@prisma/client';

export interface PaymentTermLineInput {
  sequence: number;
  calculationType: PaymentTermLineType;
  percentage: Prisma.Decimal | string | null;
  dueDays: number;
}

export interface PaymentTermWithLines {
  lines: PaymentTermLineInput[];
}

export interface PaymentScheduleLine {
  sequence: number;
  calculationType: PaymentTermLineType;
  dueDate: Date;
  amount: Prisma.Decimal;
}

const ZERO = new Prisma.Decimal(0);
const ONE_HUNDRED = new Prisma.Decimal(100);

export class PaymentTermsCalculator {
  static calculate(
    amountInput: Prisma.Decimal | string,
    documentDate: Date,
    term: PaymentTermWithLines,
    minorUnitPrecision: number,
  ): PaymentScheduleLine[] {
    const amount = new Prisma.Decimal(amountInput);
    if (!amount.isFinite() || amount.lte(ZERO)) {
      throw new Error('Payment amount must be greater than zero');
    }
    if (
      !Number.isInteger(minorUnitPrecision) ||
      minorUnitPrecision < 0 ||
      minorUnitPrecision > 8
    ) {
      throw new Error('Currency precision is invalid');
    }
    if (
      !(documentDate instanceof Date) ||
      Number.isNaN(documentDate.getTime())
    ) {
      throw new Error('Document date is invalid');
    }
    if (!term.lines.length)
      throw new Error('Payment term must contain at least one line');

    let percentageTotal = ZERO;
    let balanceCount = 0;
    let previousDueDays = 0;
    term.lines.forEach((line, index) => {
      if (line.sequence !== index + 1)
        throw new Error('Payment term line sequence must be contiguous');
      if (!Number.isInteger(line.dueDays) || line.dueDays < 0)
        throw new Error('Due days must be non-negative integers');
      if (index > 0 && line.dueDays < previousDueDays)
        throw new Error('Payment term due dates must be ordered');
      previousDueDays = line.dueDays;

      if (line.calculationType === PaymentTermLineType.BALANCE) {
        balanceCount += 1;
        if (line.percentage !== null)
          throw new Error('BALANCE lines cannot have a percentage');
      } else {
        if (line.percentage === null)
          throw new Error('PERCENT lines require a percentage');
        const percentage = new Prisma.Decimal(line.percentage);
        if (
          !percentage.isFinite() ||
          percentage.lte(ZERO) ||
          percentage.gt(ONE_HUNDRED)
        ) {
          throw new Error(
            'Payment percentages must be greater than zero and at most 100',
          );
        }
        percentageTotal = percentageTotal.plus(percentage);
      }
    });

    if (balanceCount > 1)
      throw new Error('Payment term may contain only one BALANCE line');
    if (
      balanceCount === 1 &&
      term.lines[term.lines.length - 1].calculationType !==
        PaymentTermLineType.BALANCE
    ) {
      throw new Error('BALANCE must be the final payment term line');
    }
    if (balanceCount === 0 && !percentageTotal.eq(ONE_HUNDRED)) {
      throw new Error(
        'Percentages must sum to 100% when no BALANCE line exists',
      );
    }
    if (balanceCount === 1 && percentageTotal.gt(ONE_HUNDRED)) {
      throw new Error('Percentages cannot exceed 100%');
    }

    const normalizedDocumentDate = new Date(
      Date.UTC(
        documentDate.getUTCFullYear(),
        documentDate.getUTCMonth(),
        documentDate.getUTCDate(),
      ),
    );
    let allocated = ZERO;
    return term.lines.map((line, index) => {
      const isFinal = index === term.lines.length - 1;
      const lineAmount = isFinal
        ? amount
            .minus(allocated)
            .toDecimalPlaces(minorUnitPrecision, Prisma.Decimal.ROUND_HALF_UP)
        : new Prisma.Decimal(
            line.calculationType === PaymentTermLineType.BALANCE
              ? amount.minus(allocated)
              : amount
                  .mul(new Prisma.Decimal(line.percentage!))
                  .div(ONE_HUNDRED),
          ).toDecimalPlaces(minorUnitPrecision, Prisma.Decimal.ROUND_HALF_UP);
      allocated = allocated.plus(lineAmount);

      const dueDate = new Date(normalizedDocumentDate);
      dueDate.setUTCDate(dueDate.getUTCDate() + line.dueDays);
      return Object.freeze({
        sequence: line.sequence,
        calculationType: line.calculationType,
        dueDate,
        amount: lineAmount,
      });
    });
  }
}

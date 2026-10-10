import { Prisma } from '@prisma/client';

export type BaseConversionSide = 'debit' | 'credit';

export interface BaseConversionLineInput {
  accountId: string;
  transactionDebit: Prisma.Decimal;
  transactionCredit: Prisma.Decimal;
}

export interface BaseConversionLine extends BaseConversionLineInput {
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
}

export interface BaseConversionResult {
  lines: BaseConversionLine[];
  debitTotal: Prisma.Decimal;
  creditTotal: Prisma.Decimal;
  transactionDebitTotal: Prisma.Decimal;
  transactionCreditTotal: Prisma.Decimal;
  residual: Prisma.Decimal;
  residualAccountId: string | null;
  residualSide: BaseConversionSide | null;
}

/** Convert transaction amounts once and allocate only bounded rounding residuals. */
export function convertAndAllocateBaseCurrency(
  input: BaseConversionLineInput[],
  exchangeRate: Prisma.Decimal,
): BaseConversionResult {
  const lines = input.map((line) => ({
    ...line,
    debit: line.transactionDebit.mul(exchangeRate).toDecimalPlaces(4),
    credit: line.transactionCredit.mul(exchangeRate).toDecimalPlaces(4),
  }));
  let debitTotal = lines.reduce(
    (total, line) => total.add(line.debit),
    new Prisma.Decimal(0),
  );
  let creditTotal = lines.reduce(
    (total, line) => total.add(line.credit),
    new Prisma.Decimal(0),
  );
  const transactionDebitTotal = input.reduce(
    (total, line) => total.add(line.transactionDebit),
    new Prisma.Decimal(0),
  );
  const transactionCreditTotal = input.reduce(
    (total, line) => total.add(line.transactionCredit),
    new Prisma.Decimal(0),
  );
  const residual = debitTotal.sub(creditTotal);
  let residualAccountId: string | null = null;
  let residualSide: BaseConversionSide | null = null;

  if (!residual.isZero()) {
    const maximumResidual = new Prisma.Decimal(lines.length).mul('0.00005');
    if (residual.abs().gt(maximumResidual)) {
      throw new Error(
        'Journal base-currency imbalance exceeds conversion-rounding tolerance',
      );
    }
    const side: BaseConversionSide = residual.gt(0) ? 'debit' : 'credit';
    const amountToRemove = residual.abs();
    const candidate = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line[side].gte(amountToRemove))
      .sort((left, right) => {
        const amountComparison = right.line[side].comparedTo(left.line[side]);
        return amountComparison || left.index - right.index;
      })[0];
    if (!candidate) {
      throw new Error('Journal conversion residual cannot be allocated safely');
    }
    candidate.line[side] = candidate.line[side].sub(amountToRemove);
    if (side === 'debit') debitTotal = debitTotal.sub(amountToRemove);
    else creditTotal = creditTotal.sub(amountToRemove);
    residualAccountId = candidate.line.accountId;
    residualSide = side;
  }

  return {
    lines,
    debitTotal,
    creditTotal,
    transactionDebitTotal,
    transactionCreditTotal,
    residual,
    residualAccountId,
    residualSide,
  };
}

import { BadRequestException } from '@nestjs/common';
import { AccountingMoney } from './accounting.money';

describe('AccountingMoney', () => {
  it('adds decimal strings exactly without JavaScript floating-point drift', () => {
    const total = AccountingMoney.fromString('0.1').add(
      AccountingMoney.fromString('0.2'),
    );

    expect(total.toString()).toBe('0.3000');
  });

  it('supports exact debit/credit comparisons', () => {
    expect(
      AccountingMoney.fromString('100.2500').eq(
        AccountingMoney.fromString('100.25'),
      ),
    ).toBe(true);
    expect(AccountingMoney.fromString('0.01').isPositive()).toBe(true);
    expect(AccountingMoney.fromString('-0.01').isNegative()).toBe(true);
  });

  it('rejects non-decimal values and amounts beyond the accounting scale', () => {
    expect(() => AccountingMoney.fromString('0.12345')).toThrow(
      BadRequestException,
    );
    expect(() => AccountingMoney.fromString('1e3')).toThrow(
      BadRequestException,
    );
    expect(() => AccountingMoney.fromString('Infinity')).toThrow(
      BadRequestException,
    );
  });

  it('allows exchange-rate precision without relaxing money precision', () => {
    expect(() =>
      AccountingMoney.fromString('1.23456789', 'exchangeRate', 8),
    ).not.toThrow();
    expect(() => AccountingMoney.fromString('1.23456')).toThrow(
      BadRequestException,
    );
  });
});

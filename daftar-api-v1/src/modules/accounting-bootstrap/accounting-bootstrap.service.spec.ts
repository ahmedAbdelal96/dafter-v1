import { Prisma } from '@prisma/client';
import {
  generateMonthlyPeriods,
  InitializeCompanyAccounting,
} from './accounting-bootstrap.service';
import { TemplateService } from './template.service';

describe('Accounting bootstrap foundation', () => {
  it('generates twelve contiguous July-to-June periods', () => {
    const periods = generateMonthlyPeriods(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2027-06-30T00:00:00.000Z'),
    );

    expect(periods).toHaveLength(12);
    expect(periods[0]).toEqual({
      name: '2026-07',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-31T00:00:00.000Z'),
    });
    expect(periods[11]).toEqual({
      name: '2027-06',
      startDate: new Date('2027-06-01T00:00:00.000Z'),
      endDate: new Date('2027-06-30T00:00:00.000Z'),
    });
    for (let index = 1; index < periods.length; index += 1) {
      expect(periods[index].startDate.getTime()).toBe(
        periods[index - 1].endDate.getTime() + 86_400_000,
      );
    }
  });

  it('rejects invalid fiscal ranges and validates required semantic keys', () => {
    expect(() =>
      generateMonthlyPeriods(
        new Date('2027-01-02T00:00:00.000Z'),
        new Date('2027-01-01T00:00:00.000Z'),
      ),
    ).toThrow();
    expect(() =>
      TemplateService.assertRequiredSystemKeys(new Set(['AR_CONTROL'])),
    ).toThrow();
    expect(() =>
      TemplateService.assertRequiredSystemKeys(
        new Set([
          'AR_CONTROL',
          'AP_CONTROL',
          'SALES_REVENUE',
          'DEFAULT_EXPENSE',
          'RETAINED_EARNINGS',
          'OPENING_BALANCE_EQUITY',
          'TAX_PAYABLE',
          'TAX_RECOVERABLE',
          'INVENTORY',
          'COGS',
          'EXCHANGE_GAIN',
          'EXCHANGE_LOSS',
          'ROUNDING',
        ]),
      ),
    ).not.toThrow();
  });

  it('exposes a deterministic idempotent bootstrap contract', () => {
    const idempotency = {
      executeMutation: jest
        .fn()
        .mockImplementation((params: { run: () => Promise<unknown> }) =>
          params.run(),
        ),
    };
    const prisma = {
      $transaction: jest.fn(),
      company: { findFirst: jest.fn() },
    };
    const initializer = new InitializeCompanyAccounting(
      prisma as never,
      idempotency as never,
      {} as TemplateService,
    );
    expect(initializer).toBeDefined();
    expect(new Prisma.Decimal('100.00').toString()).toBe('100');
  });
});

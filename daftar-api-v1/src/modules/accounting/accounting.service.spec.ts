import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountingPeriodStatus, FiscalYearStatus } from '@prisma/client';
import { AccountingService } from './accounting.service';

function makePosting(overrides: Record<string, unknown> = {}) {
  return {
    journalId: 'journal-1',
    accountingPeriodId: 'period-1',
    postingDate: '2026-01-15',
    transactionCurrencyCode: 'EGP',
    exchangeRate: '1',
    description: 'Opening test posting',
    idempotencyKey: 'test-key-1',
    lines: [
      {
        accountId: 'account-1',
        transactionDebit: '100.10',
        transactionCredit: '0',
      },
      {
        accountId: 'account-2',
        transactionDebit: '0',
        transactionCredit: '100.10',
      },
    ],
    ...overrides,
  };
}

function makeService() {
  const tx = {
    journalEntry: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    accountingPeriod: { findFirst: jest.fn() },
    accountingConfiguration: { findUnique: jest.fn() },
    currency: { findUnique: jest.fn() },
    accountingJournal: { findFirst: jest.fn() },
    accountingAccount: { findMany: jest.fn() },
    journalLine: { createMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
    journalEntry: { findFirst: jest.fn() },
  };
  const idempotency = {
    buildRequestHash: jest.fn((payload: unknown) => JSON.stringify(payload)),
  };
  const service = new AccountingService(prisma as never, idempotency as never);

  tx.journalEntry.findFirst.mockResolvedValue(null);
  tx.accountingConfiguration.findUnique.mockResolvedValue({
    baseCurrencyCode: 'EGP',
  });
  tx.currency.findUnique.mockImplementation(
    ({ where }: { where: { code: string } }) =>
      Promise.resolve({
        code: where.code,
        isActive: true,
        minorUnitPrecision: where.code === 'JPY' ? 0 : 2,
      }),
  );
  tx.accountingPeriod.findFirst.mockResolvedValue({
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-01-31T00:00:00.000Z'),
    status: AccountingPeriodStatus.OPEN,
    fiscalYearId: 'fy-1',
    fiscalYear: {
      status: FiscalYearStatus.OPEN,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
  tx.accountingJournal.findFirst.mockResolvedValue({
    isActive: true,
    currencyCode: null,
  });
  tx.accountingAccount.findMany.mockResolvedValue([
    {
      id: 'account-1',
      code: '1000',
      isActive: true,
      allowDirectPosting: true,
      currencyCode: null,
    },
    {
      id: 'account-2',
      code: '4000',
      isActive: true,
      allowDirectPosting: true,
      currencyCode: null,
    },
  ]);

  return { service, tx, prisma };
}

describe('AccountingService posting invariants', () => {
  it('rejects an unbalanced journal before allocating a journal number', async () => {
    const { service, tx } = makeService();

    await expect(
      service.postManualJournal(
        'company-1',
        'user-1',
        makePosting({
          lines: [
            {
              accountId: 'account-1',
              transactionDebit: '100.10',
              transactionCredit: '0',
            },
            {
              accountId: 'account-2',
              transactionDebit: '0',
              transactionCredit: '99.10',
            },
          ],
        }) as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it('rejects accounts that are not in the posting company', async () => {
    const { service, tx } = makeService();
    tx.accountingAccount.findMany.mockResolvedValue([
      {
        id: 'account-1',
        code: '1000',
        isActive: true,
        allowDirectPosting: true,
        currencyCode: null,
      },
    ]);

    await expect(
      service.postManualJournal('company-1', 'user-1', makePosting() as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it('derives company-currency amounts from transaction amounts and the exchange rate', async () => {
    const { service, tx } = makeService();
    tx.accountingConfiguration.findUnique.mockResolvedValue({
      baseCurrencyCode: 'EGP',
    });

    tx.currency.findUnique.mockImplementation(
      ({ where }: { where: { code: string } }) =>
        Promise.resolve({
          code: where.code,
          isActive: true,
          minorUnitPrecision: 2,
        }),
    );
    tx.journalEntry.create.mockResolvedValue({ id: 'entry-1' });
    tx.journalEntry.update.mockResolvedValue({
      id: 'entry-1',
      status: 'POSTED',
      lines: [],
      journal: {},
      accountingPeriod: {},
    });
    tx.$queryRaw.mockResolvedValue([{ allocated: 1 }]);

    await service.postManualJournal(
      'company-1',
      'user-1',
      makePosting({
        transactionCurrencyCode: 'USD',
        exchangeRate: '50',
        lines: [
          {
            accountId: 'account-1',
            transactionDebit: '100.00',
            transactionCredit: '0',
          },
          {
            accountId: 'account-2',
            transactionDebit: '0',
            transactionCredit: '100.00',
          },
        ],
      }) as never,
    );

    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transactionCurrencyCode: 'USD',
          exchangeRate: expect.anything(),
        }),
      }),
    );
    expect(tx.journalLine.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            debit: expect.anything(),
            transactionDebit: expect.anything(),
          }),
        ]),
      }),
    );
  });

  it('replays the same idempotent request without creating another entry', async () => {
    const { service, tx } = makeService();
    const command = makePosting();
    const expectedHash = JSON.stringify({
      journalId: command.journalId,
      accountingPeriodId: command.accountingPeriodId,
      postingDate: command.postingDate,
      documentDate: null,
      dueDate: null,
      transactionCurrencyCode: command.transactionCurrencyCode,
      exchangeRate: command.exchangeRate,
      documentReference: null,
      description: command.description,
      periodOverrideReason: null,
      sourceType: 'MANUAL_JOURNAL',
      sourceId: null,
      reversalOfEntryId: null,
      reversalReason: null,
      lines: command.lines,
    });
    tx.journalEntry.findFirst.mockResolvedValue({
      requestHash: expectedHash,
      id: 'entry-1',
      lines: [],
      journal: {},
      accountingPeriod: {},
    });

    const result = await service.postManualJournal(
      'company-1',
      'user-1',
      command as never,
    );
    expect(result).toMatchObject({ id: 'entry-1' });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});

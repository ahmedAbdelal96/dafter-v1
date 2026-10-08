import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AccountingPeriodStatus,
  FiscalYearStatus,
  JournalSourceType,
} from '@prisma/client';
import { AccountingService } from './accounting.service';

function makePosting(overrides: Record<string, unknown> = {}) {
  return {
    journalId: 'journal-1',
    accountingPeriodId: 'period-1',
    postingDate: '2026-01-15',
    transactionCurrencyCode: 'EGP',
    exchangeRate: '1',
    description: 'Opening test posting',
    sourceType: JournalSourceType.MANUAL_JOURNAL,
    idempotencyKey: 'test-key-1',
    lines: [
      { accountId: 'account-1', debit: '100.10', credit: '0' },
      { accountId: 'account-2', debit: '0', credit: '100.10' },
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
    accountingJournal: { findFirst: jest.fn() },
    accountingAccount: { findMany: jest.fn() },
    journalLine: { createMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    journalEntry: { findFirst: jest.fn() },
  };
  const idempotency = {
    buildRequestHash: jest.fn((payload: unknown) => JSON.stringify(payload)),
  };
  const service = new AccountingService(prisma as never, idempotency as never);

  tx.journalEntry.findFirst.mockResolvedValue(null);
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
      service.post(
        'company-1',
        'user-1',
        makePosting({
          lines: [
            { accountId: 'account-1', debit: '100.10', credit: '0' },
            { accountId: 'account-2', debit: '0', credit: '99.10' },
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
      service.post('company-1', 'user-1', makePosting() as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it('requires transaction-currency lines to balance independently', async () => {
    const { service, tx } = makeService();

    await expect(
      service.post(
        'company-1',
        'user-1',
        makePosting({
          lines: [
            {
              accountId: 'account-1',
              debit: '120.00',
              credit: '0',
              transactionDebit: '100.00',
              transactionCredit: '0',
            },
            {
              accountId: 'account-2',
              debit: '0',
              credit: '120.00',
              transactionDebit: '0',
              transactionCredit: '99.00',
            },
          ],
        }) as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
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
      sourceType: command.sourceType,
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

    const result = await service.post('company-1', 'user-1', command as never);
    expect(result).toMatchObject({ id: 'entry-1' });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});

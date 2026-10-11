import { Prisma } from '@prisma/client';
import { FinancialReportsService } from './financial-reports.service';

describe('FinancialReportsService', () => {
  const entry = (overrides: Record<string, unknown> = {}) => ({
    id: crypto.randomUUID(), companyId: 'company-a', journalId: 'journal-a', accountingPeriodId: 'period-a', entryNumber: '0001', status: 'POSTED', postingDate: new Date('2026-01-10T00:00:00.000Z'), documentDate: null, dueDate: null, transactionCurrencyCode: 'EGP', exchangeRate: new Prisma.Decimal(1), documentReference: 'DOC-1', description: 'Test', sourceType: 'MANUAL_JOURNAL', sourceId: null, reversalOfEntryId: null, reversalReason: null, journal: { id: 'journal-a', code: 'GEN', name: 'General' }, lines: [], ...overrides,
  });

  it('includes the reversed original and reversal so the net report effect is zero', async () => {
    const original = entry({ id: 'original', status: 'REVERSED', lines: [{ id: 'line-original', accountId: 'account-a', sequence: 1, debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), transactionDebit: new Prisma.Decimal(100), transactionCredit: new Prisma.Decimal(0), account: { id: 'account-a', code: 'A', name: 'Asset', accountType: 'ASSET_CURRENT' }, businessPartner: null }] });
    const reversal = entry({ id: 'reversal', entryNumber: '0002', sourceType: 'REVERSAL', reversalOfEntryId: 'original', lines: [{ id: 'line-reversal', accountId: 'account-a', sequence: 1, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), transactionDebit: new Prisma.Decimal(0), transactionCredit: new Prisma.Decimal(100), account: { id: 'account-a', code: 'A', name: 'Asset', accountType: 'ASSET_CURRENT' }, businessPartner: null }] });
    const prisma = { journalEntry: { findMany: jest.fn().mockResolvedValue([original, reversal]) } } as any;
    const service = new FinancialReportsService(prisma);
    const result = await service.generalLedger('company-a', { fromDate: '2026-01-01', toDate: '2026-01-31', page: 1, limit: 100 });
    expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: 'company-a', status: { in: ['POSTED', 'REVERSED'] } }) }));
    const net = result.items.reduce((sum, line) => sum.plus(line.baseDebit).minus(line.baseCredit), new Prisma.Decimal(0));
    expect(net.eq(0)).toBe(true);
  });

  it('never accepts a company id from report filters', async () => {
    const prisma = { journalEntry: { findMany: jest.fn().mockResolvedValue([]) } } as any;
    const service = new FinancialReportsService(prisma);
    await service.generalLedger('company-a', { fromDate: '2026-01-01', toDate: '2026-01-31', page: 1, limit: 100 });
    expect(prisma.journalEntry.findMany.mock.calls[0][0].where.companyId).toBe('company-a');
    expect(prisma.journalEntry.findMany.mock.calls[0][0].where).not.toHaveProperty('companyIdFromQuery');
  });
});

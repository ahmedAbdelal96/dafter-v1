import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountingAccountType, AccountingPeriodStatus, JournalEntryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ARReconciliationService } from '../customer-payments/ar-reconciliation.service';
import { APReconciliationService } from '../supplier-payments/ap-reconciliation.service';
import { GeneralLedgerQueryDto, PeriodCloseQueryDto, ReportDateRangeDto, StatementQueryDto, TrialBalanceQueryDto, AsOfDateQueryDto } from './dto/financial-reports.dto';

const ZERO = () => new Prisma.Decimal(0);
const add = (a: Prisma.Decimal, b: Prisma.Decimal) => a.plus(b);
const signed = (debit: Prisma.Decimal, credit: Prisma.Decimal) => debit.minus(credit);
const date = (value: string) => {
  const result = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime())) throw new BadRequestException(`Invalid date: ${value}`);
  return result;
};
const out = (value: Prisma.Decimal) => value.toFixed(4);

type EntryWithLines = Prisma.JournalEntryGetPayload<{ include: { journal: true; lines: { include: { account: true; businessPartner: true }; }; } }>;

@Injectable()
export class FinancialReportsService {
  constructor(private readonly prisma: PrismaService, private readonly ar?: ARReconciliationService, private readonly ap?: APReconciliationService) {}

  private validateRange(fromDate: string, toDate: string) {
    const from = date(fromDate); const to = date(toDate);
    if (from > to) throw new BadRequestException('fromDate must be before or equal to toDate');
    return { from, to };
  }

  private async entries(companyId: string, range?: { from?: Date; to?: Date }): Promise<EntryWithLines[]> {
    return this.prisma.journalEntry.findMany({
      where: { companyId, status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] }, ...(range?.from || range?.to ? { postingDate: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } } : {}) },
      include: { journal: true, lines: { include: { account: true, businessPartner: true }, orderBy: { sequence: 'asc' } } },
      orderBy: [{ postingDate: 'asc' }, { entryNumber: 'asc' }],
    });
  }

  async generalLedger(companyId: string, query: GeneralLedgerQueryDto) {
    const { from, to } = this.validateRange(query.fromDate, query.toDate);
    const entries = await this.entries(companyId, { from, to });
    const all = entries.flatMap((entry) => entry.lines.map((line) => ({ entry, line })));
    const filtered = all.filter(({ entry, line }) =>
      (!query.accountId || line.accountId === query.accountId) && (!query.journalId || entry.journalId === query.journalId) &&
      (!query.businessPartnerId || line.businessPartnerId === query.businessPartnerId) && (!query.sourceType || entry.sourceType === query.sourceType) &&
      (!query.search || [entry.entryNumber, entry.documentReference, entry.description, line.documentReference, line.description].some((v) => v?.toLowerCase().includes(query.search!.toLowerCase()))));
    let running = ZERO();
    const items = filtered.map(({ entry, line }) => {
      running = add(running, signed(line.debit, line.credit));
      return { postingDate: entry.postingDate.toISOString().slice(0, 10), documentDate: entry.documentDate?.toISOString().slice(0, 10) ?? null, entryId: entry.id, entryNumber: entry.entryNumber, journal: { id: entry.journal.id, code: entry.journal.code, name: entry.journal.name }, account: { id: line.account.id, code: line.account.code, name: line.account.name, type: line.account.accountType }, description: line.description ?? entry.description, documentReference: line.documentReference ?? entry.documentReference, sourceType: entry.sourceType, sourceId: entry.sourceId, businessPartner: line.businessPartner ? { id: line.businessPartner.id, code: line.businessPartner.partnerCode, name: line.businessPartner.displayName } : null, transactionCurrency: entry.transactionCurrencyCode, transactionDebit: out(line.transactionDebit), transactionCredit: out(line.transactionCredit), baseDebit: out(line.debit), baseCredit: out(line.credit), runningBaseBalance: out(running), reversalOfEntryId: entry.reversalOfEntryId, reversalReason: entry.reversalReason }; });
    const page = query.page ?? 1; const limit = query.limit ?? 100;
    return { items: items.slice((page - 1) * limit, page * limit), page, limit, total: items.length };
  }

  async trialBalance(companyId: string, query: TrialBalanceQueryDto) {
    const { from, to } = this.validateRange(query.fromDate, query.toDate);
    const [accounts, openingEntries, periodEntries] = await Promise.all([this.prisma.accountingAccount.findMany({ where: { companyId }, orderBy: [{ code: 'asc' }] }), this.entries(companyId, { to: new Date(from.getTime() - 86400000) }), this.entries(companyId, { from, to })]);
    const byAccount = new Map<string, { openingDebit: Prisma.Decimal; openingCredit: Prisma.Decimal; periodDebit: Prisma.Decimal; periodCredit: Prisma.Decimal }>();
    accounts.forEach((a) => byAccount.set(a.id, { openingDebit: ZERO(), openingCredit: ZERO(), periodDebit: ZERO(), periodCredit: ZERO() }));
    openingEntries.flatMap((e) => e.lines).forEach((l) => { const x = byAccount.get(l.accountId); if (x) { x.openingDebit = add(x.openingDebit, l.debit); x.openingCredit = add(x.openingCredit, l.credit); } });
    periodEntries.flatMap((e) => e.lines).forEach((l) => { const x = byAccount.get(l.accountId); if (x) { x.periodDebit = add(x.periodDebit, l.debit); x.periodCredit = add(x.periodCredit, l.credit); } });
    const rows = accounts.map((a) => { const x = byAccount.get(a.id)!; const closingDebit = add(x.openingDebit, x.periodDebit); const closingCredit = add(x.openingCredit, x.periodCredit); return { accountId: a.id, code: a.code, name: a.name, accountType: a.accountType, parentId: a.parentId, openingDebit: out(x.openingDebit), openingCredit: out(x.openingCredit), periodDebit: out(x.periodDebit), periodCredit: out(x.periodCredit), closingDebit: out(closingDebit), closingCredit: out(closingCredit) }; }).filter((x) => query.includeZero || [x.openingDebit, x.openingCredit, x.periodDebit, x.periodCredit].some((v) => v !== '0.0000'));
    const totals = rows.reduce((t, x) => ({ openingDebit: add(t.openingDebit, new Prisma.Decimal(x.openingDebit)), openingCredit: add(t.openingCredit, new Prisma.Decimal(x.openingCredit)), periodDebit: add(t.periodDebit, new Prisma.Decimal(x.periodDebit)), periodCredit: add(t.periodCredit, new Prisma.Decimal(x.periodCredit)), closingDebit: add(t.closingDebit, new Prisma.Decimal(x.closingDebit)), closingCredit: add(t.closingCredit, new Prisma.Decimal(x.closingCredit)) }), { openingDebit: ZERO(), openingCredit: ZERO(), periodDebit: ZERO(), periodCredit: ZERO(), closingDebit: ZERO(), closingCredit: ZERO() });
    return { rows, totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, out(v)])), balanced: [totals.openingDebit.eq(totals.openingCredit), totals.periodDebit.eq(totals.periodCredit), totals.closingDebit.eq(totals.closingCredit)].every(Boolean) };
  }

  async profitLoss(companyId: string, query: ReportDateRangeDto) {
    const tb = await this.trialBalance(companyId, { ...query, includeZero: false });
    const groups: Record<string, Prisma.Decimal> = {}; const typeToGroup: Partial<Record<AccountingAccountType, string>> = { INCOME_OPERATING_REVENUE: 'operatingRevenue', INCOME_OTHER: 'otherIncome', EXPENSE_COGS: 'cogs', EXPENSE_OPERATING: 'operatingExpenses', EXPENSE_DEPRECIATION: 'depreciation', EXPENSE_OTHER: 'otherExpenses' };
    tb.rows.forEach((r) => { const g = typeToGroup[r.accountType]; if (g) groups[g] = add(groups[g] ?? ZERO(), signed(new Prisma.Decimal(r.periodCredit), new Prisma.Decimal(r.periodDebit))); });
    const revenue = add(groups.operatingRevenue ?? ZERO(), groups.otherIncome ?? ZERO()); const expenses = ['cogs', 'operatingExpenses', 'depreciation', 'otherExpenses'].reduce((x, k) => add(x, groups[k] ?? ZERO()), ZERO());
    return { sections: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, out(v)])), totalRevenue: out(revenue), totalExpenses: out(expenses), netProfitLoss: out(revenue.minus(expenses)) };
  }

  async balanceSheet(companyId: string, query: AsOfDateQueryDto) {
    const tb = await this.trialBalance(companyId, { fromDate: '1900-01-01', toDate: query.asOfDate, includeZero: false });
    const rows = tb.rows.filter((r) => r.accountType.startsWith('ASSET_') || r.accountType.startsWith('LIABILITY_') || r.accountType === 'EQUITY');
    const total = (types: string[]) => rows.filter((r) => types.includes(r.accountType)).reduce((x, r) => add(x, signed(new Prisma.Decimal(r.closingDebit), new Prisma.Decimal(r.closingCredit))), ZERO());
    const assets = total(['ASSET_RECEIVABLE','ASSET_CASH','ASSET_BANK','ASSET_CURRENT','ASSET_INVENTORY','ASSET_PREPAID','ASSET_FIXED','ASSET_OTHER']); const liabilities = total(['LIABILITY_PAYABLE','LIABILITY_CURRENT','LIABILITY_NON_CURRENT','LIABILITY_TAX']); const equity = total(['EQUITY']);
    const pl = await this.profitLoss(companyId, { fromDate: '1900-01-01', toDate: query.asOfDate }); const currentEarnings = new Prisma.Decimal(pl.netProfitLoss); const difference = assets.minus(liabilities.plus(equity).plus(currentEarnings));
    return { asOfDate: query.asOfDate, assets: out(assets), liabilities: out(liabilities), equity: out(equity), currentEarnings: out(currentEarnings), liabilitiesAndEquity: out(liabilities.plus(equity).plus(currentEarnings)), difference: out(difference), balanced: difference.eq(0), integrity: difference.eq(0) ? 'BALANCED' : 'IMBALANCED', rows };
  }

  async statement(companyId: string, query: StatementQueryDto, direction: 'customer' | 'supplier') {
    const { from, to } = this.validateRange(query.fromDate, query.toDate); const entries = await this.entries(companyId, { from, to });
    const lines = entries.flatMap((entry) => entry.lines.filter((line) => line.businessPartnerId === query.businessPartnerId && (!query.currency || entry.transactionCurrencyCode === query.currency)).map((line) => ({ entry, line })));
    const openingEntries = await this.entries(companyId, { to: new Date(from.getTime() - 86400000) }); let opening = ZERO(); openingEntries.flatMap((e) => e.lines.filter((l) => l.businessPartnerId === query.businessPartnerId && (!query.currency || e.transactionCurrencyCode === query.currency))).forEach((l) => { opening = add(opening, signed(l.transactionDebit, l.transactionCredit)); });
    let running = opening; const items = lines.map(({ entry, line }) => { const delta = direction === 'customer' ? signed(line.transactionDebit, line.transactionCredit) : signed(line.transactionCredit, line.transactionDebit); running = add(running, delta); return { postingDate: entry.postingDate.toISOString().slice(0,10), entryId: entry.id, entryNumber: entry.entryNumber, sourceType: entry.sourceType, sourceId: entry.sourceId, currency: entry.transactionCurrencyCode, debit: out(line.transactionDebit), credit: out(line.transactionCredit), runningBalance: out(running), documentReference: line.documentReference ?? entry.documentReference, description: line.description ?? entry.description }; });
    return { businessPartnerId: query.businessPartnerId, currency: query.currency ?? 'grouped-by-currency', openingBalance: out(opening), items, closingBalance: out(running) };
  }

  async aging(companyId: string, query: AsOfDateQueryDto, direction: 'ar' | 'ap') {
    const asOf = date(query.asOfDate);
    const openItems = direction === 'ar' && this.ar ? await this.ar.listOpenItems(companyId) : direction === 'ap' && this.ap ? await this.ap.listOpenItems(companyId) : null;
    if (openItems) {
      const map = new Map<string, any>();
      openItems.filter((item) => item.dueDate && item.dueDate <= asOf).forEach((item) => { const dueDate = item.dueDate!; const key = `${item.businessPartnerId}:${item.currencyCode}`; const row = map.get(key) ?? { businessPartnerId: item.businessPartnerId, currency: item.currencyCode, notDue: ZERO(), b1_30: ZERO(), b31_60: ZERO(), b61_90: ZERO(), b91_120: ZERO(), b120Plus: ZERO(), total: ZERO(), remainingBase: ZERO(), oldestDueDate: null }; const amount = new Prisma.Decimal(item.remainingTransactionAmount); const base = new Prisma.Decimal(item.remainingBaseAmount); const days = Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000); const bucket = days <= 0 ? 'notDue' : days <= 30 ? 'b1_30' : days <= 60 ? 'b31_60' : days <= 90 ? 'b61_90' : days <= 120 ? 'b91_120' : 'b120Plus'; row[bucket] = add(row[bucket], amount); row.total = add(row.total, amount); row.remainingBase = add(row.remainingBase, base); row.oldestDueDate = !row.oldestDueDate || dueDate < row.oldestDueDate ? dueDate : row.oldestDueDate; map.set(key, row); });
      const rows = [...map.values()].map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => v instanceof Prisma.Decimal ? [k, out(v)] : [k, v instanceof Date ? v.toISOString().slice(0,10) : v]))); return { asOfDate: query.asOfDate, buckets: ['notDue','b1_30','b31_60','b61_90','b91_120','b120Plus'], rows, source: 'reconciliation-open-items' };
    }
    const entries = await this.entries(companyId, { to: asOf }); const wanted = direction === 'ar' ? 'ASSET_RECEIVABLE' : 'LIABILITY_PAYABLE'; const map = new Map<string, any>();
    entries.flatMap((e) => e.lines.filter((l) => l.account.accountType === wanted && l.businessPartnerId && l.dueDate).map((line) => ({ entry: e, line }))).forEach(({ entry, line: l }) => { const key = `${l.businessPartnerId}:${entry.transactionCurrencyCode}`; const row = map.get(key) ?? { businessPartnerId: l.businessPartnerId, currency: entry.transactionCurrencyCode, notDue: ZERO(), b1_30: ZERO(), b31_60: ZERO(), b61_90: ZERO(), b91_120: ZERO(), b120Plus: ZERO(), total: ZERO(), oldestDueDate: null }; const amount = direction === 'ar' ? signed(l.transactionDebit, l.transactionCredit) : signed(l.transactionCredit, l.transactionDebit); const days = Math.floor((asOf.getTime() - l.dueDate!.getTime()) / 86400000); const bucket = days <= 0 ? 'notDue' : days <= 30 ? 'b1_30' : days <= 60 ? 'b31_60' : days <= 90 ? 'b61_90' : days <= 120 ? 'b91_120' : 'b120Plus'; row[bucket] = add(row[bucket], amount); row.total = add(row.total, amount); row.oldestDueDate = !row.oldestDueDate || l.dueDate! < row.oldestDueDate ? l.dueDate : row.oldestDueDate; map.set(key, row); });
    const rows = [...map.values()].map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => v instanceof Prisma.Decimal ? [k, out(v)] : [k, v instanceof Date ? v.toISOString().slice(0,10) : v]))); return { asOfDate: query.asOfDate, buckets: ['notDue','b1_30','b31_60','b61_90','b91_120','b120Plus'], rows };
  }

  async periodClose(companyId: string, query: PeriodCloseQueryDto) {
    const period = await this.prisma.accountingPeriod.findFirst({ where: { id: query.periodId, companyId }, include: { fiscalYear: true } }); if (!period) throw new NotFoundException('Accounting period not found');
    const entries = await this.prisma.journalEntry.findMany({ where: { companyId, accountingPeriodId: period.id }, include: { lines: true } }); const drafts = entries.filter((e) => e.status === JournalEntryStatus.DRAFT).length; const unbalanced = entries.filter((e) => !e.lines.reduce((x, l) => x.plus(l.debit), ZERO()).eq(e.lines.reduce((x, l) => x.plus(l.credit), ZERO()))).length;
    return { period: { id: period.id, name: period.name, startDate: period.startDate.toISOString().slice(0,10), endDate: period.endDate.toISOString().slice(0,10), status: period.status }, fiscalYear: { id: period.fiscalYear.id, name: period.fiscalYear.name, status: period.fiscalYear.status }, draftJournalEntries: drafts, unbalancedJournalEntries: unbalanced, hardClosePermitted: period.status !== AccountingPeriodStatus.CLOSED && drafts === 0 && unbalanced === 0, integrityWarnings: [...(drafts ? ['DRAFT_JOURNAL_ENTRIES'] : []), ...(unbalanced ? ['UNBALANCED_JOURNAL_ENTRIES'] : [])] };
  }
}

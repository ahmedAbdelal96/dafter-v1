// ============================================
// Reports Repository - Database Layer
// ============================================
// Pure data access + report shaping.
// All queries are company-scoped for strict tenant isolation.
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import {
  DeferredSaleStatus,
  LedgerEntryType,
  PartyType,
  Prisma,
  SaleType,
  ScheduleStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { QueryCollectionDto } from './dto/query-collection.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import {
  buildPaginationMeta,
  normalizePagination,
  type PaginationMeta,
} from './use-cases/shared/pagination';
import { daysDiff, endOfDay, startOfDay } from './use-cases/shared/date';
import { matchesSearchTerm, normalizeSearchTerm } from './use-cases/shared/text-search';

export interface SummaryResult {
  totalReceivables: string;
  deferredSales: {
    total: number;
    totalAmount: string;
    paidAmount: string;
    remainingAmount: string;
    overdueCount: number;
    overdueAmount: string;
  };
  installments: {
    activeContracts: number;
    totalAmount: string;
    paidAmount: string;
    remainingAmount: string;
    overdueSchedules: number;
    overdueAmount: string;
  };
}

export interface OverdueDeferredSaleItem {
  id: string;
  referenceNumber: string;
  partyName: string;
  partyPhone: string | null;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  dueDate: Date;
  daysOverdue: number;
}

export interface OverdueScheduleItem {
  scheduleId: string;
  contractNumber: string;
  installmentNumber: number;
  partyName: string;
  amount: string;
  paidAmount: string;
  remainingAmount: string;
  dueDate: Date;
  daysOverdue: number;
}

export interface OverdueResult {
  deferredSales: OverdueDeferredSaleItem[];
  installmentSchedules: OverdueScheduleItem[];
  meta: PaginationMeta;
}

export interface CollectionItem {
  type: 'DEFERRED' | 'INSTALLMENT';
  referenceNumber: string;
  dueDate: Date;
  partyName: string;
  partyPhone: string | null;
  expectedAmount: string;
  daysUntilDue: number;
}

export interface CollectionResult {
  items: CollectionItem[];
  meta: PaginationMeta;
}

export interface ProfitLossCategoryItem {
  category: string;
  amount: string;
}

export interface ProfitLossRevenueByPartyTypeItem {
  partyType: PartyType;
  amount: string;
}

export interface ProfitLossResult {
  period: {
    dateFrom: string;
    dateTo: string;
    days: number;
  };
  revenue: {
    invoicesCount: number;
    grossSales: string;
    taxAmount: string;
    netSales: string;
    byPartyType: ProfitLossRevenueByPartyTypeItem[];
  };
  expenses: {
    expensesCount: number;
    total: string;
    byCategory: ProfitLossCategoryItem[];
  };
  profit: {
    grossProfit: string;
    netProfit: string;
    marginPercent: string;
  };
  comparison: {
    previousPeriod: {
      dateFrom: string;
      dateTo: string;
      days: number;
    };
    revenue: string;
    expenses: string;
    netProfit: string;
    netProfitGrowthPercent: string | null;
  } | null;
}

export interface ProfitLossQueryParams {
  dateFrom: Date;
  dateTo: Date;
  comparePrevious: boolean;
}

export interface CashFlowQueryParams {
  dateFrom: Date;
  dateTo: Date;
  page: number;
  limit: number;
  sortOrder: 'asc' | 'desc';
}

export interface CashFlowDayItem {
  date: string;
  inflow: string;
  outflow: string;
  net: string;
  closingBalance: string;
}

export interface CashFlowResult {
  period: {
    dateFrom: string;
    dateTo: string;
    days: number;
  };
  totals: {
    openingBalance: string;
    inflow: string;
    outflow: string;
    netChange: string;
    closingBalance: string;
  };
  items: CashFlowDayItem[];
  meta: PaginationMeta;
}

export interface AgingQueryParams {
  asOfDate: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
}

export interface AgingPartyRow {
  partyId: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  totalOutstanding: string;
  bucket_0_30: string;
  bucket_31_60: string;
  bucket_61_90: string;
  bucket_90_plus: string;
  oldestDueDate: string | null;
  lastTransactionDate: string | null;
}

export interface AgingResult {
  asOfDate: string;
  summary: {
    partiesCount: number;
    totalOutstanding: string;
    bucket_0_30: string;
    bucket_31_60: string;
    bucket_61_90: string;
    bucket_90_plus: string;
  };
  items: AgingPartyRow[];
  meta: PaginationMeta;
}

export interface SalesDetailedQueryParams {
  dateFrom?: Date;
  dateTo?: Date;
  partyType?: PartyType;
  partyId?: string;
  createdById?: string;
  saleType?: SaleType;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface SalesDetailedResult {
  summary: {
    invoicesCount: number;
    grossAmount: string;
    taxAmount: string;
    netAmount: string;
  };
  items: Array<{
    id: string;
    invoiceNumber: string;
    issueDate: string;
    partyType: PartyType;
    partyId: string;
    partyName: string;
    totalAmount: string;
    taxAmount: string;
    netAmount: string;
    saleType: SaleType;
    createdBy: { id: string; fullName: string | null };
  }>;
  meta: PaginationMeta;
}

export interface ExpensesAnalyticsQueryParams {
  dateFrom: Date;
  dateTo: Date;
  category?: string;
  supplierId?: string;
  search?: string;
  comparePrevious: boolean;
  page: number;
  limit: number;
  sortOrder: 'asc' | 'desc';
}

export interface ExpensesAnalyticsResult {
  period: {
    dateFrom: string;
    dateTo: string;
    days: number;
  };
  summary: {
    totalAmount: string;
    expensesCount: number;
    averageExpense: string;
  };
  byCategory: Array<{
    category: string;
    amount: string;
    count: number;
    percentOfTotal: string;
  }>;
  comparison: {
    previousTotalAmount: string;
    previousExpensesCount: number;
    growthPercent: string | null;
  } | null;
  items: Array<{
    id: string;
    expenseDate: string;
    category: string;
    amount: string;
    supplierName: string | null;
    description: string | null;
    createdBy: { id: string; fullName: string | null };
  }>;
  meta: PaginationMeta;
}

export interface ProductsPerformanceQueryParams {
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  isActive?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface ProductsPerformanceResult {
  summary: {
    totalProducts: number;
    totalQuantity: string;
    totalSalesAmount: string;
  };
  items: Array<{
    productId: string | null;
    productName: string;
    sku: string | null;
    category: string | null;
    quantitySold: string;
    salesAmount: string;
    averageUnitPrice: string;
    invoicesCount: number;
  }>;
  meta: PaginationMeta;
}

export interface OperationalPerformanceQueryParams {
  dateFrom: Date;
  dateTo: Date;
  comparePrevious: boolean;
}

export interface OperationalPerformanceResult {
  period: {
    dateFrom: string;
    dateTo: string;
    days: number;
  };
  sales: {
    invoicesCount: number;
    revenue: string;
    avgInvoiceValue: string;
    growthPercent: string | null;
  };
  expenses: {
    total: string;
    growthPercent: string | null;
  };
  quality: {
    cancelledInvoicesCount: number;
    cancellationRatePercent: string;
  };
  collections: {
    expected: string;
    actual: string;
    collectionRatePercent: string;
  };
}

export interface CriticalAlertsQueryParams {
  asOfDate: Date;
  creditUsageThresholdPercent: number;
  largeOverdueAmount: number;
  upcomingInstallmentsDays: number;
  limit: number;
}

export interface CriticalAlertsResult {
  asOfDate: string;
  creditLimitRisk: Array<{
    customerId: string;
    name: string;
    phone: string | null;
    creditLimit: string;
    balance: string;
    usagePercent: string;
  }>;
  largeOverdues: Array<{
    type: 'DEFERRED' | 'INSTALLMENT';
    referenceNumber: string;
    partyName: string;
    dueDate: string;
    overdueDays: number;
    outstandingAmount: string;
  }>;
  expensesSpike: {
    current: string;
    previous: string;
    growthPercent: string | null;
    isAlert: boolean;
  };
  upcomingInstallments: Array<{
    contractId: string;
    contractNumber: string;
    scheduleId: string;
    partyName: string;
    dueDate: string;
    amount: string;
    remainingAmount: string;
  }>;
}

export interface LedgerStatementReportQueryParams {
  partyType: PartyType;
  partyId: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}

export interface LedgerStatementReportResult {
  party: {
    id: string;
    name: string;
    partyType: PartyType;
  };
  openingBalance: string;
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  currentBalance: string;
  items: Array<{
    id: string;
    date: string;
    dueDate: string | null;
    entryType: string;
    note: string | null;
    debit: string;
    credit: string;
    runningBalance: string;
  }>;
  meta: PaginationMeta;
}

export interface CollectionsFollowupQueryParams {
  dateFrom: Date;
  dateTo: Date;
  partyType?: PartyType;
  partyId?: string;
  search?: string;
  flow?: 'DEFERRED' | 'INSTALLMENT';
  metric?: 'PAID' | 'REMAINING' | 'OVERDUE';
  page: number;
  limit: number;
  sortOrder: 'asc' | 'desc';
}

export interface CollectionsFollowupResult {
  period: {
    dateFrom: string;
    dateTo: string;
  };
  summary: {
    expectedAmount: string;
    collectedAmount: string;
    collectionRatePercent: string;
    overdueOutstanding: string;
  };
  items: CollectionItem[];
  meta: PaginationMeta;
}

export interface DebtsSummaryQueryParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  entityType?: 'CUSTOMER' | 'SUPPLIER';
  balanceType?: 'RECEIVABLE' | 'PAYABLE';
  search?: string;
  isActive?: boolean;
  minAmount?: number;
}

export interface DebtsSummaryResult {
  totals: {
    customersReceivable: string;
    customersCredit: string;
    suppliersReceivable: string;
    suppliersPayable: string;
    netReceivable: string;
  };
  items: Array<{
    entityType: 'CUSTOMER' | 'SUPPLIER';
    partyId: string;
    name: string;
    phone: string | null;
    isActive: boolean;
    amount: string;
    balanceRaw: string;
    balanceType: 'RECEIVABLE' | 'PAYABLE';
  }>;
  meta: PaginationMeta;
}

export interface StaffActivityQueryParams {
  dateFrom: Date;
  dateTo: Date;
  userId?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface StaffActivityResult {
  period: {
    dateFrom: string;
    dateTo: string;
  };
  summary: {
    usersCount: number;
    totalActivities: number;
    totalInvoices: number;
    totalInvoiceAmount: string;
    totalCollections: string;
    totalExpenses: string;
  };
  items: Array<{
    userId: string;
    fullName: string;
    email: string;
    role: string;
    activitiesCount: number;
    invoicesCount: number;
    invoicesAmount: string;
    collectionsAmount: string;
    expensesAmount: string;
    lastActivityAt: string | null;
  }>;
  meta: PaginationMeta;
}

type OverdueUnifiedItem =
  | {
      source: 'DEFERRED';
      payload: OverdueDeferredSaleItem;
      orderDate: Date;
      orderDays: number;
    }
  | {
      source: 'INSTALLMENT';
      payload: OverdueScheduleItem;
      orderDate: Date;
      orderDays: number;
    };

function toFixed2(val: Prisma.Decimal | null | undefined): string {
  if (!val) return '0.00';
  return new Prisma.Decimal(val.toString()).toFixed(2);
}

function toDecimal(val: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (val == null) return new Prisma.Decimal(0);
  return new Prisma.Decimal(val.toString());
}

function toPercentString(numerator: Prisma.Decimal, denominator: Prisma.Decimal): string {
  if (denominator.eq(0)) return '0.00';
  return numerator.div(denominator).mul(100).toFixed(2);
}

function toDateOnlyIso(value: Date): string {
  return value.toISOString().split('T')[0];
}

function addDays(value: Date, days: number): Date {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d;
}

@Injectable()
export class ReportsRepository {
  private readonly logger = new Logger(ReportsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    companyId: string,
    filters: Pick<QueryReportsDto, 'partyType' | 'dateFrom' | 'dateTo'>,
  ): Promise<SummaryResult> {
    this.logger.debug(`getSummary: companyId=${companyId}`);

    const { partyType, dateFrom, dateTo } = filters;

    const createdAtFilter =
      dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: startOfDay(new Date(dateFrom)) }),
              ...(dateTo && { lte: endOfDay(new Date(dateTo)) }),
            },
          }
        : {};

    const partyTypeFilter = partyType ? { partyType } : {};

    const activeDeferredWhere: Prisma.DeferredSaleWhereInput = {
      companyId,
      isDeleted: false,
      status: {
        in: [
          DeferredSaleStatus.PENDING,
          DeferredSaleStatus.PARTIAL,
          DeferredSaleStatus.OVERDUE,
        ],
      },
      ...partyTypeFilter,
      ...createdAtFilter,
    };

    const overdueDeferredWhere: Prisma.DeferredSaleWhereInput = {
      ...activeDeferredWhere,
      status: DeferredSaleStatus.OVERDUE,
    };

    const activeInstallmentWhere: Prisma.InstallmentContractWhereInput = {
      companyId,
      isDeleted: false,
      status: 'ACTIVE',
      ...partyTypeFilter,
      ...createdAtFilter,
    };

    const overdueScheduleWhere: Prisma.InstallmentScheduleWhereInput = {
      companyId,
      status: ScheduleStatus.OVERDUE,
      contract: {
        companyId,
        isDeleted: false,
        status: 'ACTIVE',
        ...partyTypeFilter,
        ...createdAtFilter,
      },
    };

    const balanceWhere: Prisma.BalanceWhereInput = {
      companyId,
      balance: { gt: 0 },
      ...(partyType && { partyType }),
    };

    const [
      receivablesAgg,
      deferredAgg,
      deferredCount,
      overdueDeferredAgg,
      overdueDeferredCount,
      activeInstallmentAgg,
      activeInstallmentCount,
      overdueScheduleAgg,
      overdueScheduleCount,
    ] = await Promise.all([
      this.prisma.balance.aggregate({
        where: balanceWhere,
        _sum: { balance: true },
      }),
      this.prisma.deferredSale.aggregate({
        where: activeDeferredWhere,
        _sum: { totalAmount: true, paidAmount: true },
      }),
      this.prisma.deferredSale.count({ where: activeDeferredWhere }),
      this.prisma.deferredSale.aggregate({
        where: overdueDeferredWhere,
        _sum: { totalAmount: true, paidAmount: true },
      }),
      this.prisma.deferredSale.count({ where: overdueDeferredWhere }),
      this.prisma.installmentContract.aggregate({
        where: activeInstallmentWhere,
        _sum: { totalAmount: true, paidAmount: true },
      }),
      this.prisma.installmentContract.count({ where: activeInstallmentWhere }),
      this.prisma.installmentSchedule.aggregate({
        where: overdueScheduleWhere,
        _sum: { amount: true, paidAmount: true },
      }),
      this.prisma.installmentSchedule.count({ where: overdueScheduleWhere }),
    ]);

    const totalReceivables = toFixed2(receivablesAgg._sum.balance);

    const deferredTotal = new Prisma.Decimal(toFixed2(deferredAgg._sum.totalAmount));
    const deferredPaid = new Prisma.Decimal(toFixed2(deferredAgg._sum.paidAmount));
    const deferredRemaining = deferredTotal.sub(deferredPaid).toFixed(2);

    const overdueDefTotal = new Prisma.Decimal(toFixed2(overdueDeferredAgg._sum.totalAmount));
    const overdueDefPaid = new Prisma.Decimal(toFixed2(overdueDeferredAgg._sum.paidAmount));
    const overdueDefAmount = overdueDefTotal.sub(overdueDefPaid).toFixed(2);

    const installTotal = new Prisma.Decimal(toFixed2(activeInstallmentAgg._sum.totalAmount));
    const installPaid = new Prisma.Decimal(toFixed2(activeInstallmentAgg._sum.paidAmount));
    const installRemaining = installTotal.sub(installPaid).toFixed(2);

    const overdueSchTotal = new Prisma.Decimal(toFixed2(overdueScheduleAgg._sum.amount));
    const overdueSchPaid = new Prisma.Decimal(toFixed2(overdueScheduleAgg._sum.paidAmount));
    const overdueSchAmount = overdueSchTotal.sub(overdueSchPaid).toFixed(2);

    return {
      totalReceivables,
      deferredSales: {
        total: deferredCount,
        totalAmount: deferredTotal.toFixed(2),
        paidAmount: deferredPaid.toFixed(2),
        remainingAmount: deferredRemaining,
        overdueCount: overdueDeferredCount,
        overdueAmount: overdueDefAmount,
      },
      installments: {
        activeContracts: activeInstallmentCount,
        totalAmount: installTotal.toFixed(2),
        paidAmount: installPaid.toFixed(2),
        remainingAmount: installRemaining,
        overdueSchedules: overdueScheduleCount,
        overdueAmount: overdueSchAmount,
      },
    };
  }

  async getOverdue(companyId: string, params: QueryReportsDto): Promise<OverdueResult> {
    const { page, limit, skip } = normalizePagination(params);
    const { partyType, partyId, minDaysOverdue = 1, search } = params;

    this.logger.debug(
      `getOverdue: companyId=${companyId} | page=${page} | limit=${limit} | minDays=${minDaysOverdue}`,
    );

    const today = startOfDay(new Date());
    const searchTerm = normalizeSearchTerm(search);

    const deferredWhere: Prisma.DeferredSaleWhereInput = {
      companyId,
      isDeleted: false,
      status: DeferredSaleStatus.OVERDUE,
      dueDate: { lt: today },
      ...(partyType && { partyType }),
      ...(partyId && { partyId }),
    };

    const scheduleWhere: Prisma.InstallmentScheduleWhereInput = {
      companyId,
      status: ScheduleStatus.OVERDUE,
      dueDate: { lt: today },
      contract: {
        companyId,
        isDeleted: false,
        status: 'ACTIVE',
        ...(partyType && { partyType }),
        ...(partyId && { partyId }),
      },
    };

    const [rawDeferredSales, rawSchedules] = await Promise.all([
      this.prisma.deferredSale.findMany({
        where: deferredWhere,
        select: {
          id: true,
          referenceNumber: true,
          partyType: true,
          partyId: true,
          totalAmount: true,
          paidAmount: true,
          dueDate: true,
        },
      }),
      this.prisma.installmentSchedule.findMany({
        where: scheduleWhere,
        select: {
          id: true,
          installmentNumber: true,
          dueDate: true,
          amount: true,
          paidAmount: true,
          contract: {
            select: {
              contractNumber: true,
              partyType: true,
              partyId: true,
            },
          },
        },
      }),
    ]);

    const deferredPartyNames = await this.batchResolvePartyNames(
      companyId,
      rawDeferredSales.map((ds) => ({
        partyType: ds.partyType,
        partyId: ds.partyId,
      })),
    );

    const schedulePartyNames = await this.batchResolvePartyNames(
      companyId,
      rawSchedules.map((sch) => ({
        partyType: sch.contract.partyType,
        partyId: sch.contract.partyId,
      })),
    );

    const unified: OverdueUnifiedItem[] = [];

    for (const ds of rawDeferredSales) {
      const daysOverdue = daysDiff(ds.dueDate, today);
      if (daysOverdue < minDaysOverdue) continue;

      const { name, phone } = deferredPartyNames.get(ds.partyId) ?? {
        name: 'غير معروف',
        phone: null,
      };

      if (!matchesSearchTerm(searchTerm, ds.referenceNumber, name, phone)) continue;

      const total = new Prisma.Decimal(ds.totalAmount.toString());
      const paid = new Prisma.Decimal(ds.paidAmount.toString());

      const payload: OverdueDeferredSaleItem = {
        id: ds.id,
        referenceNumber: ds.referenceNumber,
        partyName: name,
        partyPhone: phone,
        totalAmount: total.toFixed(2),
        paidAmount: paid.toFixed(2),
        remainingAmount: total.sub(paid).toFixed(2),
        dueDate: ds.dueDate,
        daysOverdue,
      };

      unified.push({
        source: 'DEFERRED',
        payload,
        orderDate: ds.dueDate,
        orderDays: daysOverdue,
      });
    }

    for (const sch of rawSchedules) {
      const daysOverdue = daysDiff(sch.dueDate, today);
      if (daysOverdue < minDaysOverdue) continue;

      const { name } = schedulePartyNames.get(sch.contract.partyId) ?? {
        name: 'غير معروف',
      };

      if (!matchesSearchTerm(searchTerm, sch.contract.contractNumber, name)) continue;

      const amount = new Prisma.Decimal(sch.amount.toString());
      const paid = new Prisma.Decimal(sch.paidAmount.toString());

      const payload: OverdueScheduleItem = {
        scheduleId: sch.id,
        contractNumber: sch.contract.contractNumber,
        installmentNumber: sch.installmentNumber,
        partyName: name,
        amount: amount.toFixed(2),
        paidAmount: paid.toFixed(2),
        remainingAmount: amount.sub(paid).toFixed(2),
        dueDate: sch.dueDate,
        daysOverdue,
      };

      unified.push({
        source: 'INSTALLMENT',
        payload,
        orderDate: sch.dueDate,
        orderDays: daysOverdue,
      });
    }

    unified.sort((a, b) => {
      if (b.orderDays !== a.orderDays) return b.orderDays - a.orderDays;
      return a.orderDate.getTime() - b.orderDate.getTime();
    });

    const total = unified.length;
    const paged = unified.slice(skip, skip + limit);

    const deferredSales: OverdueDeferredSaleItem[] = [];
    const installmentSchedules: OverdueScheduleItem[] = [];

    for (const item of paged) {
      if (item.source === 'DEFERRED') {
        deferredSales.push(item.payload as OverdueDeferredSaleItem);
      } else {
        installmentSchedules.push(item.payload as OverdueScheduleItem);
      }
    }

    return {
      deferredSales,
      installmentSchedules,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getCollectionSchedule(
    companyId: string,
    params: QueryCollectionDto,
  ): Promise<CollectionResult> {
    const { page, limit, skip } = normalizePagination(params);
    const { dateFrom, dateTo, partyType, partyId, search, sortOrder } = params;

    this.logger.debug(`getCollectionSchedule: companyId=${companyId} | page=${page} | limit=${limit}`);

    const items = await this.getCollectionScheduleItems(companyId, {
      dateFrom,
      dateTo,
      partyType,
      partyId,
      search,
      sortOrder,
    });

    const total = items.length;
    const pageItems = items.slice(skip, skip + limit);

    return {
      items: pageItems,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  private async getCollectionScheduleItems(
    companyId: string,
    params: {
      dateFrom: string;
      dateTo: string;
      partyType?: PartyType;
      partyId?: string;
      search?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<CollectionItem[]> {
    const { dateFrom, dateTo, partyType, partyId, search, sortOrder = 'asc' } = params;

    const fromDate = startOfDay(new Date(dateFrom));
    const toDate = endOfDay(new Date(dateTo));
    const today = startOfDay(new Date());
    const searchTerm = normalizeSearchTerm(search);

    const deferredWhere: Prisma.DeferredSaleWhereInput = {
      companyId,
      isDeleted: false,
      status: {
        in: [DeferredSaleStatus.PENDING, DeferredSaleStatus.PARTIAL],
      },
      dueDate: { gte: fromDate, lte: toDate },
      ...(partyType && { partyType }),
      ...(partyId && { partyId }),
    };

    const scheduleWhere: Prisma.InstallmentScheduleWhereInput = {
      companyId,
      status: {
        in: [ScheduleStatus.PENDING, ScheduleStatus.PARTIAL],
      },
      dueDate: { gte: fromDate, lte: toDate },
      contract: {
        companyId,
        isDeleted: false,
        status: 'ACTIVE',
        ...(partyType && { partyType }),
        ...(partyId && { partyId }),
      },
    };

    const [rawDeferred, rawSchedules] = await Promise.all([
      this.prisma.deferredSale.findMany({
        where: deferredWhere,
        select: {
          referenceNumber: true,
          partyType: true,
          partyId: true,
          totalAmount: true,
          paidAmount: true,
          dueDate: true,
        },
      }),
      this.prisma.installmentSchedule.findMany({
        where: scheduleWhere,
        select: {
          dueDate: true,
          amount: true,
          paidAmount: true,
          contract: {
            select: {
              contractNumber: true,
              partyType: true,
              partyId: true,
            },
          },
        },
      }),
    ]);

    const partyNames = await this.batchResolvePartyNames(companyId, [
      ...rawDeferred.map((ds) => ({ partyType: ds.partyType, partyId: ds.partyId })),
      ...rawSchedules.map((sch) => ({
        partyType: sch.contract.partyType,
        partyId: sch.contract.partyId,
      })),
    ]);

    const items: CollectionItem[] = [];

    for (const ds of rawDeferred) {
      const { name, phone } = partyNames.get(ds.partyId) ?? {
        name: 'غير معروف',
        phone: null,
      };

      if (!matchesSearchTerm(searchTerm, ds.referenceNumber, name, phone)) continue;

      const total = new Prisma.Decimal(ds.totalAmount.toString());
      const paid = new Prisma.Decimal(ds.paidAmount.toString());

      items.push({
        type: 'DEFERRED',
        referenceNumber: ds.referenceNumber,
        dueDate: ds.dueDate,
        partyName: name,
        partyPhone: phone,
        expectedAmount: total.sub(paid).toFixed(2),
        daysUntilDue: daysDiff(today, ds.dueDate),
      });
    }

    for (const sch of rawSchedules) {
      const { name, phone } = partyNames.get(sch.contract.partyId) ?? {
        name: 'غير معروف',
        phone: null,
      };

      if (!matchesSearchTerm(searchTerm, sch.contract.contractNumber, name, phone)) continue;

      const amount = new Prisma.Decimal(sch.amount.toString());
      const paid = new Prisma.Decimal(sch.paidAmount.toString());

      items.push({
        type: 'INSTALLMENT',
        referenceNumber: sch.contract.contractNumber,
        dueDate: sch.dueDate,
        partyName: name,
        partyPhone: phone,
        expectedAmount: amount.sub(paid).toFixed(2),
        daysUntilDue: daysDiff(today, sch.dueDate),
      });
    }

    items.sort((a, b) =>
      sortOrder === 'desc'
        ? b.dueDate.getTime() - a.dueDate.getTime()
        : a.dueDate.getTime() - b.dueDate.getTime(),
    );

    return items;
  }

  async getProfitLoss(
    companyId: string,
    params: ProfitLossQueryParams,
  ): Promise<ProfitLossResult> {
    const { dateFrom, dateTo, comparePrevious } = params;
    const from = startOfDay(dateFrom);
    const to = endOfDay(dateTo);

    const rangeMs = to.getTime() - from.getTime();
    const dayMs = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.floor(rangeMs / dayMs) + 1);

    this.logger.debug(
      `getProfitLoss: companyId=${companyId} | from=${from.toISOString()} | to=${to.toISOString()}`,
    );

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      companyId,
      isDeleted: false,
      issueDate: { gte: from, lte: to },
    };

    const expenseWhere: Prisma.ExpenseWhereInput = {
      companyId,
      isDeleted: false,
      expenseDate: { gte: from, lte: to },
    };

    const [
      invoiceAggregate,
      invoiceCount,
      invoiceByPartyType,
      expenseAggregate,
      expenseCount,
      expenseByCategory,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: {
          totalAmount: true,
          taxAmount: true,
        },
      }),
      this.prisma.invoice.count({ where: invoiceWhere }),
      this.prisma.invoice.groupBy({
        by: ['partyType'],
        where: invoiceWhere,
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      }),
      this.prisma.expense.count({ where: expenseWhere }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: expenseWhere,
        _sum: { amount: true },
      }),
    ]);

    const grossSales = toDecimal(invoiceAggregate._sum.totalAmount);
    const taxAmount = toDecimal(invoiceAggregate._sum.taxAmount);
    const netSales = grossSales.sub(taxAmount);
    const totalExpenses = toDecimal(expenseAggregate._sum.amount);
    const netProfit = netSales.sub(totalExpenses);

    let comparison: ProfitLossResult['comparison'] = null;

    if (comparePrevious) {
      const prevTo = new Date(from.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - (days - 1) * dayMs);

      const prevInvoiceWhere: Prisma.InvoiceWhereInput = {
        companyId,
        isDeleted: false,
        issueDate: { gte: startOfDay(prevFrom), lte: endOfDay(prevTo) },
      };

      const prevExpenseWhere: Prisma.ExpenseWhereInput = {
        companyId,
        isDeleted: false,
        expenseDate: { gte: startOfDay(prevFrom), lte: endOfDay(prevTo) },
      };

      const [prevInvoiceAgg, prevExpenseAgg] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: prevInvoiceWhere,
          _sum: { totalAmount: true, taxAmount: true },
        }),
        this.prisma.expense.aggregate({
          where: prevExpenseWhere,
          _sum: { amount: true },
        }),
      ]);

      const prevGrossSales = toDecimal(prevInvoiceAgg._sum.totalAmount);
      const prevTax = toDecimal(prevInvoiceAgg._sum.taxAmount);
      const prevNetSales = prevGrossSales.sub(prevTax);
      const prevExpenses = toDecimal(prevExpenseAgg._sum.amount);
      const prevNetProfit = prevNetSales.sub(prevExpenses);

      const growth = prevNetProfit.eq(0)
        ? null
        : netProfit
            .sub(prevNetProfit)
            .div(prevNetProfit.abs())
            .mul(100)
            .toFixed(2);

      comparison = {
        previousPeriod: {
          dateFrom: toDateOnlyIso(startOfDay(prevFrom)),
          dateTo: toDateOnlyIso(endOfDay(prevTo)),
          days,
        },
        revenue: prevNetSales.toFixed(2),
        expenses: prevExpenses.toFixed(2),
        netProfit: prevNetProfit.toFixed(2),
        netProfitGrowthPercent: growth,
      };
    }

    return {
      period: {
        dateFrom: toDateOnlyIso(from),
        dateTo: toDateOnlyIso(to),
        days,
      },
      revenue: {
        invoicesCount: invoiceCount,
        grossSales: grossSales.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        netSales: netSales.toFixed(2),
        byPartyType: invoiceByPartyType.map((item) => ({
          partyType: item.partyType,
          amount: toDecimal(item._sum.totalAmount).toFixed(2),
        })),
      },
      expenses: {
        expensesCount: expenseCount,
        total: totalExpenses.toFixed(2),
        byCategory: expenseByCategory.map((item) => ({
          category: item.category,
          amount: toDecimal(item._sum.amount).toFixed(2),
        })),
      },
      profit: {
        grossProfit: netSales.toFixed(2),
        netProfit: netProfit.toFixed(2),
        marginPercent: toPercentString(netProfit, netSales),
      },
      comparison,
    };
  }

  async getCashFlow(
    companyId: string,
    params: CashFlowQueryParams,
  ): Promise<CashFlowResult> {
    const { page, limit, sortOrder } = params;
    const from = startOfDay(params.dateFrom);
    const to = endOfDay(params.dateTo);
    const dayMs = 1000 * 60 * 60 * 24;
    const days = Math.max(
      1,
      Math.floor((to.getTime() - from.getTime()) / dayMs) + 1,
    );

    this.logger.debug(
      `getCashFlow: companyId=${companyId} | from=${from.toISOString()} | to=${to.toISOString()} | page=${page} | limit=${limit}`,
    );

    const priorRange = { lt: from };
    const periodRange = { gte: from, lte: to };

    const [
      priorCashSales,
      priorCollections,
      priorPaymentOut,
      priorExpenses,
      cashSalesByDay,
      collectionsByDay,
      paymentOutByDay,
      expensesByDay,
    ] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: {
          companyId,
          isDeleted: false,
          entryType: LedgerEntryType.INVOICE,
          saleType: SaleType.CASH,
          signedAmount: { gt: 0 },
          entryDate: priorRange,
        },
        _sum: { signedAmount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          companyId,
          isDeleted: false,
          entryType: LedgerEntryType.PAYMENT,
          signedAmount: { lt: 0 },
          entryDate: priorRange,
        },
        _sum: { signedAmount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          companyId,
          isDeleted: false,
          entryType: LedgerEntryType.PAYMENT,
          signedAmount: { gt: 0 },
          entryDate: priorRange,
        },
        _sum: { signedAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId,
          isDeleted: false,
          expenseDate: priorRange,
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.groupBy({
        by: ['entryDate'],
        where: {
          companyId,
          isDeleted: false,
          entryType: LedgerEntryType.INVOICE,
          saleType: SaleType.CASH,
          signedAmount: { gt: 0 },
          entryDate: periodRange,
        },
        _sum: { signedAmount: true },
      }),
      this.prisma.ledgerEntry.groupBy({
        by: ['entryDate'],
        where: {
          companyId,
          isDeleted: false,
          entryType: LedgerEntryType.PAYMENT,
          signedAmount: { lt: 0 },
          entryDate: periodRange,
        },
        _sum: { signedAmount: true },
      }),
      this.prisma.ledgerEntry.groupBy({
        by: ['entryDate'],
        where: {
          companyId,
          isDeleted: false,
          entryType: LedgerEntryType.PAYMENT,
          signedAmount: { gt: 0 },
          entryDate: periodRange,
        },
        _sum: { signedAmount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['expenseDate'],
        where: {
          companyId,
          isDeleted: false,
          expenseDate: periodRange,
        },
        _sum: { amount: true },
      }),
    ]);

    const openingInflow = toDecimal(priorCashSales._sum.signedAmount).add(
      toDecimal(priorCollections._sum.signedAmount).abs(),
    );
    const openingOutflow = toDecimal(priorPaymentOut._sum.signedAmount).add(
      toDecimal(priorExpenses._sum.amount),
    );
    const openingBalance = openingInflow.sub(openingOutflow);

    const inflowMap = new Map<string, Prisma.Decimal>();
    const outflowMap = new Map<string, Prisma.Decimal>();

    for (const row of cashSalesByDay) {
      inflowMap.set(
        toDateOnlyIso(row.entryDate),
        toDecimal(row._sum.signedAmount),
      );
    }

    for (const row of collectionsByDay) {
      const key = toDateOnlyIso(row.entryDate);
      const current = inflowMap.get(key) ?? new Prisma.Decimal(0);
      inflowMap.set(
        key,
        current.add(toDecimal(row._sum.signedAmount).abs()),
      );
    }

    for (const row of paymentOutByDay) {
      outflowMap.set(
        toDateOnlyIso(row.entryDate),
        toDecimal(row._sum.signedAmount),
      );
    }

    for (const row of expensesByDay) {
      const key = toDateOnlyIso(row.expenseDate);
      const current = outflowMap.get(key) ?? new Prisma.Decimal(0);
      outflowMap.set(key, current.add(toDecimal(row._sum.amount)));
    }

    const timeline: CashFlowDayItem[] = [];
    let running = new Prisma.Decimal(openingBalance.toString());

    for (let i = 0; i < days; i++) {
      const date = addDays(from, i);
      const key = toDateOnlyIso(date);
      const inflow = inflowMap.get(key) ?? new Prisma.Decimal(0);
      const outflow = outflowMap.get(key) ?? new Prisma.Decimal(0);
      const net = inflow.sub(outflow);
      running = running.add(net);

      timeline.push({
        date: key,
        inflow: inflow.toFixed(2),
        outflow: outflow.toFixed(2),
        net: net.toFixed(2),
        closingBalance: running.toFixed(2),
      });
    }

    const ordered = sortOrder === 'asc' ? timeline : [...timeline].reverse();
    const skip = (page - 1) * limit;
    const items = ordered.slice(skip, skip + limit);

    const totalInflow = timeline.reduce(
      (acc, row) => acc.add(new Prisma.Decimal(row.inflow)),
      new Prisma.Decimal(0),
    );
    const totalOutflow = timeline.reduce(
      (acc, row) => acc.add(new Prisma.Decimal(row.outflow)),
      new Prisma.Decimal(0),
    );
    const netChange = totalInflow.sub(totalOutflow);
    const closingBalance = openingBalance.add(netChange);

    return {
      period: {
        dateFrom: toDateOnlyIso(from),
        dateTo: toDateOnlyIso(to),
        days,
      },
      totals: {
        openingBalance: openingBalance.toFixed(2),
        inflow: totalInflow.toFixed(2),
        outflow: totalOutflow.toFixed(2),
        netChange: netChange.toFixed(2),
        closingBalance: closingBalance.toFixed(2),
      },
      items,
      meta: buildPaginationMeta(timeline.length, page, limit),
    };
  }

  async getPartyAging(
    companyId: string,
    partyType: 'CUSTOMER' | 'SUPPLIER',
    params: AgingQueryParams,
  ): Promise<AgingResult> {
    const { page, limit, sortBy, sortOrder, search, isActive } = params;
    const asOfDate = endOfDay(params.asOfDate);
    const searchTerm = normalizeSearchTerm(search);

    this.logger.debug(
      `getPartyAging: companyId=${companyId} | partyType=${partyType} | asOfDate=${asOfDate.toISOString()} | page=${page} | limit=${limit}`,
    );

    const balanceRows = await this.prisma.balance.findMany({
      where: {
        companyId,
        partyType: partyType as PartyType,
        balance: { gt: 0 },
      },
      select: {
        partyId: true,
        balance: true,
      },
    });

    if (balanceRows.length === 0) {
      return {
        asOfDate: toDateOnlyIso(asOfDate),
        summary: {
          partiesCount: 0,
          totalOutstanding: '0.00',
          bucket_0_30: '0.00',
          bucket_31_60: '0.00',
          bucket_61_90: '0.00',
          bucket_90_plus: '0.00',
        },
        items: [],
        meta: buildPaginationMeta(0, page, limit),
      };
    }

    const partyIds = balanceRows.map((b) => b.partyId);
    const balanceMap = new Map(
      balanceRows.map((b) => [b.partyId, new Prisma.Decimal(b.balance.toString())]),
    );

    const [parties, ledgerEntries] = await Promise.all([
      partyType === 'CUSTOMER'
        ? this.prisma.customer.findMany({
            where: {
              companyId,
              isDeleted: false,
              id: { in: partyIds },
              ...(typeof isActive === 'boolean' ? { isActive } : {}),
            },
            select: {
              id: true,
              name: true,
              phone: true,
              isActive: true,
            },
          })
        : this.prisma.supplier.findMany({
            where: {
              companyId,
              isDeleted: false,
              id: { in: partyIds },
              ...(typeof isActive === 'boolean' ? { isActive } : {}),
            },
            select: {
              id: true,
              name: true,
              phone: true,
              isActive: true,
            },
          }),
      this.prisma.ledgerEntry.findMany({
        where: {
          companyId,
          partyType: partyType as PartyType,
          partyId: { in: partyIds },
          isDeleted: false,
          entryDate: { lte: asOfDate },
        },
        select: {
          partyId: true,
          signedAmount: true,
          entryDate: true,
          dueDate: true,
        },
        orderBy: [
          { partyId: 'asc' },
          { dueDate: 'asc' },
          { entryDate: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
    ]);

    const partyMeta = new Map(
      parties.map((p) => [p.id, { name: p.name, phone: p.phone, isActive: p.isActive }]),
    );

    type OpenLot = { dueDate: Date; amount: Prisma.Decimal };
    const lotsByParty = new Map<string, OpenLot[]>();
    const lastTxByParty = new Map<string, Date>();

    for (const partyId of partyIds) {
      lotsByParty.set(partyId, []);
    }

    for (const entry of ledgerEntries) {
      const lotList = lotsByParty.get(entry.partyId);
      if (!lotList) continue;

      const amount = new Prisma.Decimal(entry.signedAmount.toString());
      const txDate = entry.entryDate;
      const prevLast = lastTxByParty.get(entry.partyId);
      if (!prevLast || txDate > prevLast) {
        lastTxByParty.set(entry.partyId, txDate);
      }

      if (amount.gt(0)) {
        lotList.push({
          dueDate: entry.dueDate ?? entry.entryDate,
          amount,
        });
        continue;
      }

      if (amount.lt(0)) {
        let remainingCredit = amount.abs();
        for (const lot of lotList) {
          if (remainingCredit.lte(0)) break;
          if (lot.amount.lte(0)) continue;
          const consume = Prisma.Decimal.min(lot.amount, remainingCredit);
          lot.amount = lot.amount.sub(consume);
          remainingCredit = remainingCredit.sub(consume);
        }
      }
    }

    const rows: AgingPartyRow[] = [];
    const totals = {
      totalOutstanding: new Prisma.Decimal(0),
      bucket_0_30: new Prisma.Decimal(0),
      bucket_31_60: new Prisma.Decimal(0),
      bucket_61_90: new Prisma.Decimal(0),
      bucket_90_plus: new Prisma.Decimal(0),
    };

    for (const partyId of partyIds) {
      const meta = partyMeta.get(partyId);
      if (!meta) continue;

      if (!matchesSearchTerm(searchTerm, meta.name, meta.phone ?? undefined)) {
        continue;
      }

      const partyTotal = balanceMap.get(partyId) ?? new Prisma.Decimal(0);
      if (partyTotal.lte(0)) continue;

      const lots = lotsByParty.get(partyId) ?? [];
      let b0_30 = new Prisma.Decimal(0);
      let b31_60 = new Prisma.Decimal(0);
      let b61_90 = new Prisma.Decimal(0);
      let b90 = new Prisma.Decimal(0);
      let oldestDueDate: Date | null = null;

      for (const lot of lots) {
        if (lot.amount.lte(0)) continue;
        if (!oldestDueDate || lot.dueDate < oldestDueDate) {
          oldestDueDate = lot.dueDate;
        }

        const overdueDays = Math.max(0, daysDiff(lot.dueDate, asOfDate));
        if (overdueDays <= 30) b0_30 = b0_30.add(lot.amount);
        else if (overdueDays <= 60) b31_60 = b31_60.add(lot.amount);
        else if (overdueDays <= 90) b61_90 = b61_90.add(lot.amount);
        else b90 = b90.add(lot.amount);
      }

      const bucketSum = b0_30.add(b31_60).add(b61_90).add(b90);
      if (!bucketSum.eq(partyTotal)) {
        b0_30 = b0_30.add(partyTotal.sub(bucketSum));
      }

      totals.totalOutstanding = totals.totalOutstanding.add(partyTotal);
      totals.bucket_0_30 = totals.bucket_0_30.add(b0_30);
      totals.bucket_31_60 = totals.bucket_31_60.add(b31_60);
      totals.bucket_61_90 = totals.bucket_61_90.add(b61_90);
      totals.bucket_90_plus = totals.bucket_90_plus.add(b90);

      rows.push({
        partyId,
        name: meta.name,
        phone: meta.phone ?? null,
        isActive: meta.isActive,
        totalOutstanding: partyTotal.toFixed(2),
        bucket_0_30: b0_30.toFixed(2),
        bucket_31_60: b31_60.toFixed(2),
        bucket_61_90: b61_90.toFixed(2),
        bucket_90_plus: b90.toFixed(2),
        oldestDueDate: oldestDueDate ? toDateOnlyIso(oldestDueDate) : null,
        lastTransactionDate: lastTxByParty.get(partyId)
          ? toDateOnlyIso(lastTxByParty.get(partyId)!)
          : null,
      });
    }

    rows.sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1;

      switch (sortBy) {
        case 'name':
          return direction * a.name.localeCompare(b.name);
        case 'oldestDueDate': {
          const ad = a.oldestDueDate ? new Date(a.oldestDueDate).getTime() : 0;
          const bd = b.oldestDueDate ? new Date(b.oldestDueDate).getTime() : 0;
          return direction * (ad - bd);
        }
        case 'lastTransactionDate': {
          const ad = a.lastTransactionDate
            ? new Date(a.lastTransactionDate).getTime()
            : 0;
          const bd = b.lastTransactionDate
            ? new Date(b.lastTransactionDate).getTime()
            : 0;
          return direction * (ad - bd);
        }
        case 'totalOutstanding':
        default: {
          const av = new Prisma.Decimal(a.totalOutstanding);
          const bv = new Prisma.Decimal(b.totalOutstanding);
          return direction * av.comparedTo(bv);
        }
      }
    });

    const skip = (page - 1) * limit;
    const items = rows.slice(skip, skip + limit);

    return {
      asOfDate: toDateOnlyIso(asOfDate),
      summary: {
        partiesCount: rows.length,
        totalOutstanding: totals.totalOutstanding.toFixed(2),
        bucket_0_30: totals.bucket_0_30.toFixed(2),
        bucket_31_60: totals.bucket_31_60.toFixed(2),
        bucket_61_90: totals.bucket_61_90.toFixed(2),
        bucket_90_plus: totals.bucket_90_plus.toFixed(2),
      },
      items,
      meta: buildPaginationMeta(rows.length, page, limit),
    };
  }

  async getSalesDetailed(
    companyId: string,
    params: SalesDetailedQueryParams,
  ): Promise<SalesDetailedResult> {
    const {
      dateFrom,
      dateTo,
      partyType,
      partyId,
      createdById,
      saleType,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      isDeleted: false,
      ...(partyType && { partyType }),
      ...(partyId && { partyId }),
      ...(createdById && { createdById }),
      ...(dateFrom || dateTo
        ? {
            issueDate: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
      ...(saleType === SaleType.DEFERRED ? { deferredSaleId: { not: null } } : {}),
      ...(saleType === SaleType.CASH ? { deferredSaleId: null } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: 'insensitive' } },
              { partyName: { contains: search, mode: 'insensitive' } },
              { partyPhone: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy =
      sortBy === 'totalAmount'
        ? [{ totalAmount: sortOrder }, { issueDate: 'desc' as const }]
        : [{ issueDate: sortOrder }, { createdAt: 'desc' as const }];

    const [total, totalAgg, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.aggregate({
        where,
        _sum: { totalAmount: true, taxAmount: true },
      }),
      this.prisma.invoice.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          partyType: true,
          partyId: true,
          partyName: true,
          totalAmount: true,
          taxAmount: true,
          deferredSaleId: true,
          ledgerEntryId: true,
          createdBy: {
            select: { id: true, fullName: true },
          },
        },
      }),
    ]);

    const ledgerIds = invoices
      .map((i) => i.ledgerEntryId)
      .filter((id): id is string => Boolean(id));
    const ledgerTypeMap = new Map<string, SaleType | null>();

    if (ledgerIds.length > 0) {
      const rows = await this.prisma.ledgerEntry.findMany({
        where: {
          companyId,
          id: { in: ledgerIds },
          isDeleted: false,
        },
        select: { id: true, saleType: true },
      });
      for (const row of rows) {
        ledgerTypeMap.set(row.id, row.saleType);
      }
    }

    const mapped = invoices
      .map((inv) => {
        const inferredSaleType: SaleType =
          inv.deferredSaleId
            ? SaleType.DEFERRED
            : (inv.ledgerEntryId
                ? ledgerTypeMap.get(inv.ledgerEntryId) ?? SaleType.CASH
                : SaleType.CASH);

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          issueDate: toDateOnlyIso(inv.issueDate),
          partyType: inv.partyType,
          partyId: inv.partyId,
          partyName: inv.partyName,
          totalAmount: toDecimal(inv.totalAmount).toFixed(2),
          taxAmount: toDecimal(inv.taxAmount).toFixed(2),
          netAmount: toDecimal(inv.totalAmount).sub(toDecimal(inv.taxAmount)).toFixed(2),
          saleType: inferredSaleType,
          createdBy: inv.createdBy,
        };
      })
      .filter((row) => !saleType || row.saleType === saleType);

    const grossAmount = toDecimal(totalAgg._sum.totalAmount);
    const taxAmount = toDecimal(totalAgg._sum.taxAmount);

    return {
      summary: {
        invoicesCount: total,
        grossAmount: grossAmount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        netAmount: grossAmount.sub(taxAmount).toFixed(2),
      },
      items: mapped,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getExpensesAnalytics(
    companyId: string,
    params: ExpensesAnalyticsQueryParams,
  ): Promise<ExpensesAnalyticsResult> {
    const {
      dateFrom,
      dateTo,
      category,
      supplierId,
      search,
      comparePrevious,
      page,
      limit,
      sortOrder,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      companyId,
      isDeleted: false,
      expenseDate: { gte: dateFrom, lte: dateTo },
      ...(category && { category: category as any }),
      ...(supplierId && { supplierId }),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: 'insensitive' } },
              { referenceNumber: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, agg, byCategoryRows, items] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.findMany({
        where,
        orderBy: [{ expenseDate: sortOrder }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          expenseDate: true,
          category: true,
          amount: true,
          description: true,
          supplier: { select: { name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    const totalAmount = toDecimal(agg._sum.amount);
    const days = Math.max(
      1,
      Math.floor((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );

    let comparison: ExpensesAnalyticsResult['comparison'] = null;
    if (comparePrevious) {
      const prevTo = new Date(dateFrom.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

      const prevWhere: Prisma.ExpenseWhereInput = {
        ...where,
        expenseDate: { gte: startOfDay(prevFrom), lte: endOfDay(prevTo) },
      };

      const [prevTotal, prevCount] = await Promise.all([
        this.prisma.expense.aggregate({
          where: prevWhere,
          _sum: { amount: true },
        }),
        this.prisma.expense.count({ where: prevWhere }),
      ]);

      const previousAmount = toDecimal(prevTotal._sum.amount);
      const growthPercent = previousAmount.eq(0)
        ? null
        : totalAmount
            .sub(previousAmount)
            .div(previousAmount.abs())
            .mul(100)
            .toFixed(2);

      comparison = {
        previousTotalAmount: previousAmount.toFixed(2),
        previousExpensesCount: prevCount,
        growthPercent,
      };
    }

    return {
      period: {
        dateFrom: toDateOnlyIso(dateFrom),
        dateTo: toDateOnlyIso(dateTo),
        days,
      },
      summary: {
        totalAmount: totalAmount.toFixed(2),
        expensesCount: total,
        averageExpense:
          total === 0 ? '0.00' : totalAmount.div(new Prisma.Decimal(total)).toFixed(2),
      },
      byCategory: byCategoryRows.map((row) => {
        const amount = toDecimal(row._sum.amount);
        return {
          category: row.category,
          amount: amount.toFixed(2),
          count: row._count._all,
          percentOfTotal: totalAmount.eq(0)
            ? '0.00'
            : amount.div(totalAmount).mul(100).toFixed(2),
        };
      }),
      comparison,
      items: items.map((row) => ({
        id: row.id,
        expenseDate: toDateOnlyIso(row.expenseDate),
        category: row.category,
        amount: toDecimal(row.amount).toFixed(2),
        supplierName: row.supplier?.name ?? null,
        description: row.description,
        createdBy: row.createdBy,
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getProductsPerformance(
    companyId: string,
    params: ProductsPerformanceQueryParams,
  ): Promise<ProductsPerformanceResult> {
    const { dateFrom, dateTo, search, isActive, page, limit, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;

    const itemRows = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          isDeleted: false,
          ...(dateFrom || dateTo
            ? {
                issueDate: {
                  ...(dateFrom && { gte: dateFrom }),
                  ...(dateTo && { lte: dateTo }),
                },
              }
            : {}),
        },
        ...(search
          ? {
              OR: [
                { description: { contains: search, mode: 'insensitive' } },
                { product: { name: { contains: search, mode: 'insensitive' } } },
                { product: { sku: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...(typeof isActive === 'boolean'
          ? {
              product: { isActive },
            }
          : {}),
      },
      select: {
        productId: true,
        description: true,
        quantity: true,
        unitPrice: true,
        total: true,
        invoiceId: true,
      },
    });

    const productIds = [
      ...new Set(itemRows.map((r) => r.productId).filter((id): id is string => Boolean(id))),
    ];
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds }, companyId, isDeleted: false },
          select: { id: true, name: true, sku: true, category: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const aggMap = new Map<
      string,
      {
        productId: string | null;
        productName: string;
        sku: string | null;
        category: string | null;
        qty: Prisma.Decimal;
        sales: Prisma.Decimal;
        priceTotal: Prisma.Decimal;
        lines: number;
        invoices: Set<string>;
      }
    >();

    for (const row of itemRows) {
      const key = row.productId ?? `custom:${row.description}`;
      const product = row.productId ? productMap.get(row.productId) : null;
      const current =
        aggMap.get(key) ??
        {
          productId: row.productId,
          productName: product?.name ?? row.description,
          sku: product?.sku ?? null,
          category: product?.category ?? null,
          qty: new Prisma.Decimal(0),
          sales: new Prisma.Decimal(0),
          priceTotal: new Prisma.Decimal(0),
          lines: 0,
          invoices: new Set<string>(),
        };
      current.qty = current.qty.add(toDecimal(row.quantity));
      current.sales = current.sales.add(toDecimal(row.total));
      current.priceTotal = current.priceTotal.add(toDecimal(row.unitPrice));
      current.lines += 1;
      current.invoices.add(row.invoiceId);
      aggMap.set(key, current);
    }

    const allRows = [...aggMap.values()].map((row) => ({
      productId: row.productId,
      productName: row.productName,
      sku: row.sku,
      category: row.category,
      quantitySold: row.qty.toFixed(3),
      salesAmount: row.sales.toFixed(2),
      averageUnitPrice:
        row.lines === 0
          ? '0.00'
          : row.priceTotal.div(new Prisma.Decimal(row.lines)).toFixed(2),
      invoicesCount: row.invoices.size,
    }));

    allRows.sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'quantitySold') {
        return (
          direction *
          new Prisma.Decimal(a.quantitySold).comparedTo(new Prisma.Decimal(b.quantitySold))
        );
      }
      if (sortBy === 'productName') {
        return direction * a.productName.localeCompare(b.productName);
      }
      return (
        direction *
        new Prisma.Decimal(a.salesAmount).comparedTo(new Prisma.Decimal(b.salesAmount))
      );
    });

    const totalProducts = allRows.length;
    const items = allRows.slice(skip, skip + limit);
    const totalQuantity = allRows.reduce(
      (acc, row) => acc.add(new Prisma.Decimal(row.quantitySold)),
      new Prisma.Decimal(0),
    );
    const totalSalesAmount = allRows.reduce(
      (acc, row) => acc.add(new Prisma.Decimal(row.salesAmount)),
      new Prisma.Decimal(0),
    );

    return {
      summary: {
        totalProducts,
        totalQuantity: totalQuantity.toFixed(3),
        totalSalesAmount: totalSalesAmount.toFixed(2),
      },
      items,
      meta: buildPaginationMeta(totalProducts, page, limit),
    };
  }

  async getOperationalPerformance(
    companyId: string,
    params: OperationalPerformanceQueryParams,
  ): Promise<OperationalPerformanceResult> {
    const { dateFrom, dateTo, comparePrevious } = params;
    const days = Math.max(
      1,
      Math.floor((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      companyId,
      isDeleted: false,
      issueDate: { gte: dateFrom, lte: dateTo },
    };
    const expensesWhere: Prisma.ExpenseWhereInput = {
      companyId,
      isDeleted: false,
      expenseDate: { gte: dateFrom, lte: dateTo },
    };

    const [invoiceCount, invoiceAgg, cancelledCount, expensesAgg, expectedDue, actualCollected] =
      await Promise.all([
        this.prisma.invoice.count({ where: invoiceWhere }),
        this.prisma.invoice.aggregate({ where: invoiceWhere, _sum: { totalAmount: true } }),
        this.prisma.invoice.count({
          where: {
            companyId,
            isDeleted: true,
            deletedAt: { gte: dateFrom, lte: dateTo },
          },
        }),
        this.prisma.expense.aggregate({ where: expensesWhere, _sum: { amount: true } }),
        Promise.all([
          this.prisma.deferredSale.aggregate({
            where: {
              companyId,
              isDeleted: false,
              dueDate: { gte: dateFrom, lte: dateTo },
              status: { in: [DeferredSaleStatus.PENDING, DeferredSaleStatus.PARTIAL] },
            },
            _sum: { totalAmount: true, paidAmount: true },
          }),
          this.prisma.installmentSchedule.aggregate({
            where: {
              companyId,
              dueDate: { gte: dateFrom, lte: dateTo },
              status: { in: [ScheduleStatus.PENDING, ScheduleStatus.PARTIAL] },
            },
            _sum: { amount: true, paidAmount: true },
          }),
        ]),
        Promise.all([
          this.prisma.deferredPayment.aggregate({
            where: { companyId, paymentDate: { gte: dateFrom, lte: dateTo } },
            _sum: { amount: true },
          }),
          this.prisma.installmentPayment.aggregate({
            where: { companyId, paymentDate: { gte: dateFrom, lte: dateTo } },
            _sum: { amount: true },
          }),
        ]),
      ]);

    const revenue = toDecimal(invoiceAgg._sum.totalAmount);
    const expenses = toDecimal(expensesAgg._sum.amount);
    const avgInvoiceValue =
      invoiceCount === 0
        ? new Prisma.Decimal(0)
        : revenue.div(new Prisma.Decimal(invoiceCount));

    const deferredExpected = toDecimal(expectedDue[0]._sum.totalAmount).sub(
      toDecimal(expectedDue[0]._sum.paidAmount),
    );
    const scheduleExpected = toDecimal(expectedDue[1]._sum.amount).sub(
      toDecimal(expectedDue[1]._sum.paidAmount),
    );
    const expectedCollections = deferredExpected.add(scheduleExpected);

    const actualCollections = toDecimal(actualCollected[0]._sum.amount).add(
      toDecimal(actualCollected[1]._sum.amount),
    );

    let salesGrowth: string | null = null;
    let expensesGrowth: string | null = null;
    if (comparePrevious) {
      const prevTo = new Date(dateFrom.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

      const [prevSalesAgg, prevExpensesAgg] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            companyId,
            isDeleted: false,
            issueDate: { gte: startOfDay(prevFrom), lte: endOfDay(prevTo) },
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            companyId,
            isDeleted: false,
            expenseDate: { gte: startOfDay(prevFrom), lte: endOfDay(prevTo) },
          },
          _sum: { amount: true },
        }),
      ]);

      const prevSales = toDecimal(prevSalesAgg._sum.totalAmount);
      const prevExpenses = toDecimal(prevExpensesAgg._sum.amount);
      salesGrowth = prevSales.eq(0)
        ? null
        : revenue.sub(prevSales).div(prevSales.abs()).mul(100).toFixed(2);
      expensesGrowth = prevExpenses.eq(0)
        ? null
        : expenses.sub(prevExpenses).div(prevExpenses.abs()).mul(100).toFixed(2);
    }

    return {
      period: {
        dateFrom: toDateOnlyIso(dateFrom),
        dateTo: toDateOnlyIso(dateTo),
        days,
      },
      sales: {
        invoicesCount: invoiceCount,
        revenue: revenue.toFixed(2),
        avgInvoiceValue: avgInvoiceValue.toFixed(2),
        growthPercent: salesGrowth,
      },
      expenses: {
        total: expenses.toFixed(2),
        growthPercent: expensesGrowth,
      },
      quality: {
        cancelledInvoicesCount: cancelledCount,
        cancellationRatePercent:
          invoiceCount + cancelledCount === 0
            ? '0.00'
            : new Prisma.Decimal(cancelledCount)
                .div(new Prisma.Decimal(invoiceCount + cancelledCount))
                .mul(100)
                .toFixed(2),
      },
      collections: {
        expected: expectedCollections.toFixed(2),
        actual: actualCollections.toFixed(2),
        collectionRatePercent:
          expectedCollections.eq(0)
            ? '0.00'
            : actualCollections.div(expectedCollections).mul(100).toFixed(2),
      },
    };
  }

  async getCriticalAlerts(
    companyId: string,
    params: CriticalAlertsQueryParams,
  ): Promise<CriticalAlertsResult> {
    const {
      asOfDate,
      creditUsageThresholdPercent,
      largeOverdueAmount,
      upcomingInstallmentsDays,
      limit,
    } = params;
    const thresholdRatio = new Prisma.Decimal(creditUsageThresholdPercent).div(100);

    const [customers, customerBalances, overdueDeferred, overdueSchedules] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          companyId,
          isDeleted: false,
          isActive: true,
          creditLimit: { not: null, gt: new Prisma.Decimal(0) },
        },
        select: { id: true, name: true, phone: true, creditLimit: true },
      }),
      this.prisma.balance.findMany({
        where: {
          companyId,
          partyType: PartyType.CUSTOMER,
          balance: { gt: 0 },
        },
        select: { partyId: true, balance: true },
      }),
      this.prisma.deferredSale.findMany({
        where: {
          companyId,
          isDeleted: false,
          dueDate: { lt: asOfDate },
          status: DeferredSaleStatus.OVERDUE,
        },
        select: {
          referenceNumber: true,
          dueDate: true,
          totalAmount: true,
          paidAmount: true,
          partyType: true,
          partyId: true,
        },
        take: limit * 5,
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.installmentSchedule.findMany({
        where: {
          companyId,
          dueDate: { lt: asOfDate },
          status: ScheduleStatus.OVERDUE,
        },
        select: {
          id: true,
          dueDate: true,
          amount: true,
          paidAmount: true,
          contract: {
            select: {
              contractNumber: true,
              partyType: true,
              partyId: true,
            },
          },
        },
        take: limit * 5,
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const balanceMap = new Map(
      customerBalances.map((b) => [b.partyId, new Prisma.Decimal(b.balance.toString())]),
    );

    const creditLimitRisk = customers
      .map((c) => {
        const balance = balanceMap.get(c.id) ?? new Prisma.Decimal(0);
        const limitAmount = toDecimal(c.creditLimit);
        if (limitAmount.lte(0)) return null;
        const usage = balance.div(limitAmount).mul(100);
        if (usage.lt(new Prisma.Decimal(creditUsageThresholdPercent))) return null;
        return {
          customerId: c.id,
          name: c.name,
          phone: c.phone ?? null,
          creditLimit: limitAmount.toFixed(2),
          balance: balance.toFixed(2),
          usagePercent: usage.toFixed(2),
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .slice(0, limit);

    const partyNames = await this.batchResolvePartyNames(companyId, [
      ...overdueDeferred.map((row) => ({
        partyType: row.partyType,
        partyId: row.partyId,
      })),
      ...overdueSchedules.map((row) => ({
        partyType: row.contract.partyType,
        partyId: row.contract.partyId,
      })),
    ]);

    const largeOverdues: CriticalAlertsResult['largeOverdues'] = [];

    for (const row of overdueDeferred) {
      const outstanding = toDecimal(row.totalAmount).sub(toDecimal(row.paidAmount));
      if (outstanding.lt(new Prisma.Decimal(largeOverdueAmount))) continue;
      const party = partyNames.get(row.partyId);
      largeOverdues.push({
        type: 'DEFERRED',
        referenceNumber: row.referenceNumber,
        partyName: party?.name ?? 'Unknown',
        dueDate: toDateOnlyIso(row.dueDate),
        overdueDays: Math.max(0, daysDiff(row.dueDate, asOfDate)),
        outstandingAmount: outstanding.toFixed(2),
      });
    }

    for (const row of overdueSchedules) {
      const outstanding = toDecimal(row.amount).sub(toDecimal(row.paidAmount));
      if (outstanding.lt(new Prisma.Decimal(largeOverdueAmount))) continue;
      const party = partyNames.get(row.contract.partyId);
      largeOverdues.push({
        type: 'INSTALLMENT',
        referenceNumber: row.contract.contractNumber,
        partyName: party?.name ?? 'Unknown',
        dueDate: toDateOnlyIso(row.dueDate),
        overdueDays: Math.max(0, daysDiff(row.dueDate, asOfDate)),
        outstandingAmount: outstanding.toFixed(2),
      });
    }

    largeOverdues.sort((a, b) =>
      new Prisma.Decimal(b.outstandingAmount).comparedTo(
        new Prisma.Decimal(a.outstandingAmount),
      ),
    );

    const monthStart = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 1);
    const prevMonthEnd = new Date(monthStart.getTime() - 1);
    const prevMonthStart = new Date(
      prevMonthEnd.getFullYear(),
      prevMonthEnd.getMonth(),
      1,
    );

    const [curExpense, prevExpense, upcomingSchedules] = await Promise.all([
      this.prisma.expense.aggregate({
        where: {
          companyId,
          isDeleted: false,
          expenseDate: { gte: startOfDay(monthStart), lte: endOfDay(asOfDate) },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId,
          isDeleted: false,
          expenseDate: { gte: startOfDay(prevMonthStart), lte: endOfDay(prevMonthEnd) },
        },
        _sum: { amount: true },
      }),
      this.prisma.installmentSchedule.findMany({
        where: {
          companyId,
          dueDate: {
            gte: startOfDay(asOfDate),
            lte: endOfDay(addDays(asOfDate, upcomingInstallmentsDays)),
          },
          status: { in: [ScheduleStatus.PENDING, ScheduleStatus.PARTIAL] },
        },
        select: {
          id: true,
          dueDate: true,
          amount: true,
          paidAmount: true,
          contractId: true,
          contract: {
            select: {
              contractNumber: true,
              partyType: true,
              partyId: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: limit,
      }),
    ]);

    const curAmount = toDecimal(curExpense._sum.amount);
    const prevAmount = toDecimal(prevExpense._sum.amount);
    const growthPercent = prevAmount.eq(0)
      ? null
      : curAmount.sub(prevAmount).div(prevAmount.abs()).mul(100).toFixed(2);
    const isAlert =
      growthPercent !== null && new Prisma.Decimal(growthPercent).gt(new Prisma.Decimal(25));

    const upcomingPartyNames = await this.batchResolvePartyNames(
      companyId,
      upcomingSchedules.map((row) => ({
        partyType: row.contract.partyType,
        partyId: row.contract.partyId,
      })),
    );

    return {
      asOfDate: toDateOnlyIso(asOfDate),
      creditLimitRisk,
      largeOverdues: largeOverdues.slice(0, limit),
      expensesSpike: {
        current: curAmount.toFixed(2),
        previous: prevAmount.toFixed(2),
        growthPercent,
        isAlert,
      },
      upcomingInstallments: upcomingSchedules.map((row) => ({
        contractId: row.contractId,
        contractNumber: row.contract.contractNumber,
        scheduleId: row.id,
        partyName:
          upcomingPartyNames.get(row.contract.partyId)?.name ?? 'Unknown',
        dueDate: toDateOnlyIso(row.dueDate),
        amount: toDecimal(row.amount).toFixed(2),
        remainingAmount: toDecimal(row.amount)
          .sub(toDecimal(row.paidAmount))
          .toFixed(2),
      })),
    };
  }

  async getLedgerStatementReport(
    companyId: string,
    params: LedgerStatementReportQueryParams,
  ): Promise<LedgerStatementReportResult> {
    const { partyType, partyId, dateFrom, dateTo, page, limit } = params;
    const skip = (page - 1) * limit;

    const party = await this.resolvePartyForStatement(companyId, partyType, partyId);
    if (!party) {
      return {
        party: { id: partyId, name: 'Unknown', partyType },
        openingBalance: '0.00',
        totalDebit: '0.00',
        totalCredit: '0.00',
        closingBalance: '0.00',
        currentBalance: '0.00',
        items: [],
        meta: buildPaginationMeta(0, page, limit),
      };
    }

    const openingBalanceBase = toDecimal(party.openingBalance);
    const currentBalanceRow = await this.prisma.balance.findUnique({
      where: {
        companyId_partyType_partyId: {
          companyId,
          partyType,
          partyId,
        },
      },
      select: { balance: true },
    });
    const currentBalance = toDecimal(currentBalanceRow?.balance);

    const where: Prisma.LedgerEntryWhereInput = {
      companyId,
      partyType,
      partyId,
      isDeleted: false,
      ...(dateFrom || dateTo
        ? {
            entryDate: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
    };

    let openingBalance = openingBalanceBase;
    if (dateFrom) {
      const prior = await this.prisma.ledgerEntry.aggregate({
        where: {
          companyId,
          partyType,
          partyId,
          isDeleted: false,
          entryDate: { lt: dateFrom },
        },
        _sum: { signedAmount: true },
      });
      openingBalance = openingBalance.add(toDecimal(prior._sum.signedAmount));
    }

    const [total, rows, periodAgg] = await Promise.all([
      this.prisma.ledgerEntry.count({ where }),
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          entryDate: true,
          dueDate: true,
          entryType: true,
          note: true,
          signedAmount: true,
        },
      }),
      this.prisma.ledgerEntry.aggregate({
        where,
        _sum: { signedAmount: true },
      }),
    ]);

    let pageRunningStart = openingBalance;
    if (skip > 0) {
      const preRows = await this.prisma.ledgerEntry.findMany({
        where,
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
        take: skip,
        select: { signedAmount: true },
      });
      for (const row of preRows) {
        pageRunningStart = pageRunningStart.add(toDecimal(row.signedAmount));
      }
    }

    let running = new Prisma.Decimal(pageRunningStart.toString());
    const items = rows.map((row) => {
      const amount = toDecimal(row.signedAmount);
      running = running.add(amount);
      const debit = amount.lt(0) ? amount.abs() : new Prisma.Decimal(0);
      const credit = amount.gt(0) ? amount : new Prisma.Decimal(0);
      return {
        id: row.id,
        date: toDateOnlyIso(row.entryDate),
        dueDate: row.dueDate ? toDateOnlyIso(row.dueDate) : null,
        entryType: row.entryType,
        note: row.note,
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        runningBalance: running.toFixed(2),
      };
    });

    const totalSigned = toDecimal(periodAgg._sum.signedAmount);
    const closingBalance = openingBalance.add(totalSigned);

    const totalDebit = rows.reduce(
      (acc, row) =>
        toDecimal(row.signedAmount).lt(0)
          ? acc.add(toDecimal(row.signedAmount).abs())
          : acc,
      new Prisma.Decimal(0),
    );
    const totalCredit = rows.reduce(
      (acc, row) =>
        toDecimal(row.signedAmount).gt(0)
          ? acc.add(toDecimal(row.signedAmount))
          : acc,
      new Prisma.Decimal(0),
    );

    return {
      party: { id: partyId, name: party.name, partyType },
      openingBalance: openingBalance.toFixed(2),
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      closingBalance: closingBalance.toFixed(2),
      currentBalance: currentBalance.toFixed(2),
      items,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getCollectionsFollowup(
    companyId: string,
    params: CollectionsFollowupQueryParams,
  ): Promise<CollectionsFollowupResult> {
    const {
      dateFrom,
      dateTo,
      partyType,
      partyId,
      search,
      flow,
      metric,
      page,
      limit,
      sortOrder,
    } =
      params;

    const scheduleItems = await this.getCollectionScheduleItems(companyId, {
      dateFrom: toDateOnlyIso(dateFrom),
      dateTo: toDateOnlyIso(dateTo),
      partyType,
      partyId,
      search,
      sortOrder,
    });

    const filteredItems = scheduleItems.filter((item) => {
      if (flow && item.type !== flow) return false;
      if (metric === 'OVERDUE' && item.daysUntilDue >= 0) return false;
      return true;
    });
    const pagedItems = filteredItems.slice((page - 1) * limit, (page - 1) * limit + limit);

    const [deferredCollected, installmentCollected, overdueDeferred, overdueInstallment] =
      await Promise.all([
        this.prisma.deferredPayment.aggregate({
          where: {
            companyId,
            paymentDate: { gte: dateFrom, lte: dateTo },
            ...(flow === 'DEFERRED' ? {} : flow === 'INSTALLMENT' ? { id: '__none__' } : {}),
          },
          _sum: { amount: true },
        }),
        this.prisma.installmentPayment.aggregate({
          where: {
            companyId,
            paymentDate: { gte: dateFrom, lte: dateTo },
            ...(flow === 'INSTALLMENT' ? {} : flow === 'DEFERRED' ? { id: '__none__' } : {}),
          },
          _sum: { amount: true },
        }),
        this.prisma.deferredSale.aggregate({
          where: {
            companyId,
            isDeleted: false,
            status: DeferredSaleStatus.OVERDUE,
            ...(flow === 'INSTALLMENT' ? { id: '__none__' } : {}),
            ...(partyType && { partyType }),
            ...(partyId && { partyId }),
          },
          _sum: { totalAmount: true, paidAmount: true },
        }),
        this.prisma.installmentSchedule.aggregate({
          where: {
            companyId,
            status: ScheduleStatus.OVERDUE,
            contract: {
              companyId,
              isDeleted: false,
              ...(flow === 'DEFERRED' ? { id: '__none__' } : {}),
              ...(partyType && { partyType }),
              ...(partyId && { partyId }),
            },
          },
          _sum: { amount: true, paidAmount: true },
        }),
      ]);

    const expectedAmount = filteredItems.reduce(
      (acc, item) => acc.add(toDecimal(item.expectedAmount)),
      new Prisma.Decimal(0),
    );
    const collectedAmount = toDecimal(deferredCollected._sum.amount).add(
      toDecimal(installmentCollected._sum.amount),
    );
    const overdueOutstandingFromData = toDecimal(overdueDeferred._sum.totalAmount)
      .sub(toDecimal(overdueDeferred._sum.paidAmount))
      .add(
        toDecimal(overdueInstallment._sum.amount).sub(
          toDecimal(overdueInstallment._sum.paidAmount),
        ),
      );

    const overdueOutstandingFromItems = filteredItems
      .filter((item) => item.daysUntilDue < 0)
      .reduce(
        (acc, item) => acc.add(toDecimal(item.expectedAmount)),
        new Prisma.Decimal(0),
      );

    const overdueOutstanding =
      metric === 'OVERDUE' ? overdueOutstandingFromItems : overdueOutstandingFromData;

    return {
      period: {
        dateFrom: toDateOnlyIso(dateFrom),
        dateTo: toDateOnlyIso(dateTo),
      },
      summary: {
          expectedAmount: expectedAmount.toFixed(2),
          collectedAmount: collectedAmount.toFixed(2),
          collectionRatePercent:
            expectedAmount.eq(0)
              ? '0.00'
              : collectedAmount.div(expectedAmount).mul(100).toFixed(2),
          overdueOutstanding: overdueOutstanding.toFixed(2),
        },
      items: pagedItems,
      meta: buildPaginationMeta(filteredItems.length, page, limit),
    };
  }

  async getDebtsSummary(
    companyId: string,
    params: DebtsSummaryQueryParams,
  ): Promise<DebtsSummaryResult> {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      entityType,
      balanceType,
      search,
      isActive,
      minAmount,
    } = params;
    const skip = (page - 1) * limit;
    const searchTerm = normalizeSearchTerm(search);
    const min = new Prisma.Decimal((minAmount ?? 0).toString());

    const [balances, customers, suppliers] = await Promise.all([
      this.prisma.balance.findMany({
        where: {
          companyId,
          partyType: { in: [PartyType.CUSTOMER, PartyType.SUPPLIER] },
        },
        select: {
          partyType: true,
          partyId: true,
          balance: true,
        },
      }),
      this.prisma.customer.findMany({
        where: {
          companyId,
          isDeleted: false,
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
        },
        select: { id: true, name: true, phone: true, isActive: true },
      }),
      this.prisma.supplier.findMany({
        where: {
          companyId,
          isDeleted: false,
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
        },
        select: { id: true, name: true, phone: true, isActive: true },
      }),
    ]);

    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    const totals = {
      customersReceivable: new Prisma.Decimal(0),
      customersCredit: new Prisma.Decimal(0),
      suppliersReceivable: new Prisma.Decimal(0),
      suppliersPayable: new Prisma.Decimal(0),
    };

    const rows: DebtsSummaryResult['items'] = [];

    for (const row of balances) {
      const amount = toDecimal(row.balance);
      const absAmount = amount.abs();
      if (absAmount.lt(min)) continue;

      const isReceivable = amount.gte(0);
      const type =
        row.partyType === PartyType.CUSTOMER ? ('CUSTOMER' as const) : ('SUPPLIER' as const);
      const info = type === 'CUSTOMER' ? customerMap.get(row.partyId) : supplierMap.get(row.partyId);
      if (!info) continue;

      if (!matchesSearchTerm(searchTerm, info.name, info.phone ?? undefined)) continue;

      const rowBalanceType = isReceivable ? 'RECEIVABLE' : 'PAYABLE';
      if (entityType && entityType !== type) continue;
      if (balanceType && balanceType !== rowBalanceType) continue;

      if (type === 'CUSTOMER') {
        if (isReceivable) totals.customersReceivable = totals.customersReceivable.add(absAmount);
        else totals.customersCredit = totals.customersCredit.add(absAmount);
      } else {
        if (isReceivable) totals.suppliersReceivable = totals.suppliersReceivable.add(absAmount);
        else totals.suppliersPayable = totals.suppliersPayable.add(absAmount);
      }

      rows.push({
        entityType: type,
        partyId: row.partyId,
        name: info.name,
        phone: info.phone ?? null,
        isActive: info.isActive,
        amount: absAmount.toFixed(2),
        balanceRaw: amount.toFixed(2),
        balanceType: rowBalanceType,
      });
    }

    rows.sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') return direction * a.name.localeCompare(b.name);
      if (sortBy === 'entityType') return direction * a.entityType.localeCompare(b.entityType);
      return (
        direction *
        new Prisma.Decimal(a.amount).comparedTo(new Prisma.Decimal(b.amount))
      );
    });

    const total = rows.length;
    const items = rows.slice(skip, skip + limit);

    return {
      totals: {
        customersReceivable: totals.customersReceivable.toFixed(2),
        customersCredit: totals.customersCredit.toFixed(2),
        suppliersReceivable: totals.suppliersReceivable.toFixed(2),
        suppliersPayable: totals.suppliersPayable.toFixed(2),
        netReceivable: totals.customersReceivable
          .add(totals.suppliersReceivable)
          .sub(totals.customersCredit)
          .sub(totals.suppliersPayable)
          .toFixed(2),
      },
      items,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getStaffActivity(
    companyId: string,
    params: StaffActivityQueryParams,
  ): Promise<StaffActivityResult> {
    const { dateFrom, dateTo, userId, search, page, limit, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;
    const searchTerm = normalizeSearchTerm(search);

    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        isDeleted: false,
        ...(userId && { id: userId }),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    });

    const filteredUsers = users.filter((u) =>
      matchesSearchTerm(searchTerm, u.fullName ?? undefined, u.email),
    );
    const userIds = filteredUsers.map((u) => u.id);

    if (userIds.length === 0) {
      return {
        period: { dateFrom: toDateOnlyIso(dateFrom), dateTo: toDateOnlyIso(dateTo) },
        summary: {
          usersCount: 0,
          totalActivities: 0,
          totalInvoices: 0,
          totalInvoiceAmount: '0.00',
          totalCollections: '0.00',
          totalExpenses: '0.00',
        },
        items: [],
        meta: buildPaginationMeta(0, page, limit),
      };
    }

    const [auditAgg, invoicesAgg, deferredCollections, installmentCollections, expensesAgg] =
      await Promise.all([
        this.prisma.auditLog.groupBy({
          by: ['actorUserId'],
          where: {
            companyId,
            actorUserId: { in: userIds },
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          _count: { _all: true },
          _max: { createdAt: true },
        }),
        this.prisma.invoice.groupBy({
          by: ['createdById'],
          where: {
            companyId,
            isDeleted: false,
            createdById: { in: userIds },
            issueDate: { gte: dateFrom, lte: dateTo },
          },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        this.prisma.deferredPayment.groupBy({
          by: ['createdById'],
          where: {
            companyId,
            createdById: { in: userIds },
            paymentDate: { gte: dateFrom, lte: dateTo },
          },
          _sum: { amount: true },
        }),
        this.prisma.installmentPayment.groupBy({
          by: ['createdById'],
          where: {
            companyId,
            createdById: { in: userIds },
            paymentDate: { gte: dateFrom, lte: dateTo },
          },
          _sum: { amount: true },
        }),
        this.prisma.expense.groupBy({
          by: ['createdById'],
          where: {
            companyId,
            isDeleted: false,
            createdById: { in: userIds },
            expenseDate: { gte: dateFrom, lte: dateTo },
          },
          _sum: { amount: true },
        }),
      ]);

    const auditMap = new Map(
      auditAgg.map((a) => [a.actorUserId, { count: a._count._all, last: a._max.createdAt }]),
    );
    const invoiceMap = new Map(
      invoicesAgg.map((r) => [
        r.createdById,
        { count: r._count._all, amount: toDecimal(r._sum.totalAmount) },
      ]),
    );
    const defCollectionMap = new Map(
      deferredCollections.map((r) => [r.createdById, toDecimal(r._sum.amount)]),
    );
    const instCollectionMap = new Map(
      installmentCollections.map((r) => [r.createdById, toDecimal(r._sum.amount)]),
    );
    const expenseMap = new Map(
      expensesAgg.map((r) => [r.createdById, toDecimal(r._sum.amount)]),
    );

    const rows: StaffActivityResult['items'] = filteredUsers.map((u) => {
      const audit = auditMap.get(u.id);
      const inv = invoiceMap.get(u.id);
      const collections = (defCollectionMap.get(u.id) ?? new Prisma.Decimal(0)).add(
        instCollectionMap.get(u.id) ?? new Prisma.Decimal(0),
      );
      const expenses = expenseMap.get(u.id) ?? new Prisma.Decimal(0);
      return {
        userId: u.id,
        fullName: u.fullName ?? u.email,
        email: u.email,
        role: u.role,
        activitiesCount: audit?.count ?? 0,
        invoicesCount: inv?.count ?? 0,
        invoicesAmount: (inv?.amount ?? new Prisma.Decimal(0)).toFixed(2),
        collectionsAmount: collections.toFixed(2),
        expensesAmount: expenses.toFixed(2),
        lastActivityAt: audit?.last ? audit.last.toISOString() : null,
      };
    });

    rows.sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'fullName') return direction * a.fullName.localeCompare(b.fullName);
      if (sortBy === 'invoicesAmount') {
        return (
          direction *
          new Prisma.Decimal(a.invoicesAmount).comparedTo(new Prisma.Decimal(b.invoicesAmount))
        );
      }
      return direction * (a.activitiesCount - b.activitiesCount);
    });

    const total = rows.length;
    const items = rows.slice(skip, skip + limit);

    return {
      period: { dateFrom: toDateOnlyIso(dateFrom), dateTo: toDateOnlyIso(dateTo) },
      summary: {
        usersCount: total,
        totalActivities: rows.reduce((s, r) => s + r.activitiesCount, 0),
        totalInvoices: rows.reduce((s, r) => s + r.invoicesCount, 0),
        totalInvoiceAmount: rows
          .reduce((s, r) => s.add(new Prisma.Decimal(r.invoicesAmount)), new Prisma.Decimal(0))
          .toFixed(2),
        totalCollections: rows
          .reduce((s, r) => s.add(new Prisma.Decimal(r.collectionsAmount)), new Prisma.Decimal(0))
          .toFixed(2),
        totalExpenses: rows
          .reduce((s, r) => s.add(new Prisma.Decimal(r.expensesAmount)), new Prisma.Decimal(0))
          .toFixed(2),
      },
      items,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  private async resolvePartyForStatement(
    companyId: string,
    partyType: PartyType,
    partyId: string,
  ): Promise<{ name: string; openingBalance: Prisma.Decimal } | null> {
    if (partyType === PartyType.CUSTOMER) {
      const party = await this.prisma.customer.findFirst({
        where: { companyId, id: partyId, isDeleted: false },
        select: { name: true, openingBalance: true },
      });
      return party ?? null;
    }
    if (partyType === PartyType.SUPPLIER) {
      const party = await this.prisma.supplier.findFirst({
        where: { companyId, id: partyId, isDeleted: false },
        select: { name: true, openingBalance: true },
      });
      return party ?? null;
    }
    if (partyType === PartyType.EMPLOYEE) {
      const party = await this.prisma.employee.findFirst({
        where: { companyId, id: partyId, isDeleted: false },
        select: { name: true, openingBalance: true },
      });
      return party ?? null;
    }
    return null;
  }

  private async batchResolvePartyNames(
    companyId: string,
    refs: Array<{ partyType: PartyType; partyId: string }>,
  ): Promise<Map<string, { name: string; phone: string | null }>> {
    const result = new Map<string, { name: string; phone: string | null }>();
    if (refs.length === 0) return result;

    const customerIds = new Set<string>();
    const supplierIds = new Set<string>();
    const employeeIds = new Set<string>();

    for (const ref of refs) {
      if (ref.partyType === PartyType.CUSTOMER) customerIds.add(ref.partyId);
      if (ref.partyType === PartyType.SUPPLIER) supplierIds.add(ref.partyId);
      if (ref.partyType === PartyType.EMPLOYEE) employeeIds.add(ref.partyId);
    }

    const [customers, suppliers, employees] = await Promise.all([
      customerIds.size > 0
        ? this.prisma.customer.findMany({
            where: {
              id: { in: [...customerIds] },
              companyId,
              isDeleted: false,
            },
            select: { id: true, name: true, phone: true },
          })
        : Promise.resolve([]),
      supplierIds.size > 0
        ? this.prisma.supplier.findMany({
            where: {
              id: { in: [...supplierIds] },
              companyId,
              isDeleted: false,
            },
            select: { id: true, name: true, phone: true },
          })
        : Promise.resolve([]),
      employeeIds.size > 0
        ? this.prisma.employee.findMany({
            where: {
              id: { in: [...employeeIds] },
              companyId,
              isDeleted: false,
            },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    for (const c of customers) result.set(c.id, { name: c.name, phone: c.phone ?? null });
    for (const s of suppliers) result.set(s.id, { name: s.name, phone: s.phone ?? null });
    for (const e of employees) result.set(e.id, { name: e.name, phone: null });

    return result;
  }
}

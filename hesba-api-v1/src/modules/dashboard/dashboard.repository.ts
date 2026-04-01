import { Injectable } from '@nestjs/common';
import {
  DeferredSaleStatus,
  PartyType,
  Prisma,
  SaleType,
  ScheduleStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { DashboardChartGranularity } from './dto/query-dashboard.dto';

export interface DashboardOverviewResult {
  company: {
    id: string;
    name: string;
    currencyCode: string;
  };
  period: {
    dateFrom: string;
    dateTo: string;
    preset: string;
  };
  kpis: {
    totalSales: string;
    totalExpenses: string;
    netProfit: string;
    collectionAmount: string;
    receivables: string;
    payables: string;
    cashNetFlow: string;
  };
  operations: {
    invoicesCount: number;
    deferredSalesCount: number;
    installmentContractsCount: number;
    overdueCount: number;
    activeCustomers: number;
    activeProducts: number;
    activeEmployees: number;
  };
  alerts: {
    overdueDeferredSales: number;
    overdueInstallments: number;
    customersNearCreditLimit: number;
    criticalNegativeBalances: number;
  };
}

export interface DashboardChartsResult {
  salesTrend: Array<{ label: string; value: number }>;
  expensesTrend: Array<{ label: string; value: number }>;
  collectionsTrend: Array<{ label: string; value: number }>;
  receivablesVsPayables: {
    receivables: number;
    payables: number;
  };
  salesDistribution: {
    cash: number;
    deferred: number;
    installment: number;
  };
}

export interface DashboardHighlightsResult {
  topCustomers: Array<{
    id: string;
    name: string;
    totalSales: string;
    outstandingBalance: string;
  }>;
  topProducts: Array<{
    id: string | null;
    name: string;
    quantitySold: string;
    salesAmount: string;
  }>;
  topEmployees: Array<{
    id: string;
    name: string;
    invoicesCount: number;
    salesAmount: string;
    collectionsAmount: string;
  }>;
}

export interface DashboardAlertItem {
  type:
    | 'OVERDUE_DEFERRED'
    | 'OVERDUE_INSTALLMENT'
    | 'CREDIT_LIMIT_RISK'
    | 'CRITICAL_PAYABLE';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  amount?: string;
  dueDate?: string;
}

export interface DashboardAlertsResult {
  items: DashboardAlertItem[];
}

interface DateRangeParams {
  companyId: string;
  dateFrom: Date;
  dateTo: Date;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    params: DateRangeParams & { preset: string },
  ): Promise<DashboardOverviewResult> {
    const { companyId, dateFrom, dateTo, preset } = params;

    const company = await this.prisma.company.findFirstOrThrow({
      where: { id: companyId, isDeleted: false },
      select: { id: true, name: true, currencyCode: true },
    });

    const [
      salesAgg,
      salesCount,
      expensesAgg,
      collectionsDeferredAgg,
      collectionsInstallmentAgg,
      receivablesAgg,
      supplierBalances,
      customerCreditRisk,
      customerCreditRiskBalances,
      negativeBalancesCount,
      deferredSalesCount,
      installmentContractsCount,
      overdueDeferredCount,
      overdueInstallmentsCount,
      activeCustomers,
      activeProducts,
      activeEmployees,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          isDeleted: false,
          issueDate: { gte: dateFrom, lte: dateTo },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.count({
        where: {
          companyId,
          isDeleted: false,
          issueDate: { gte: dateFrom, lte: dateTo },
        },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId,
          isDeleted: false,
          expenseDate: { gte: dateFrom, lte: dateTo },
        },
        _sum: { amount: true },
      }),
      this.prisma.deferredPayment.aggregate({
        where: {
          companyId,
          paymentDate: { gte: dateFrom, lte: dateTo },
        },
        _sum: { amount: true },
      }),
      this.prisma.installmentPayment.aggregate({
        where: {
          companyId,
          paymentDate: { gte: dateFrom, lte: dateTo },
        },
        _sum: { amount: true },
      }),
      this.prisma.balance.aggregate({
        where: {
          companyId,
          partyType: PartyType.CUSTOMER,
          balance: { gt: 0 },
        },
        _sum: { balance: true },
      }),
      this.prisma.balance.findMany({
        where: {
          companyId,
          partyType: PartyType.SUPPLIER,
        },
        select: { balance: true },
      }),
      this.prisma.customer.findMany({
        where: {
          companyId,
          isDeleted: false,
          isActive: true,
          creditLimit: { not: null, gt: new Prisma.Decimal(0) },
        },
        select: {
          id: true,
          creditLimit: true,
        },
      }),
      this.prisma.balance.findMany({
        where: {
          companyId,
          partyType: PartyType.CUSTOMER,
          balance: { gt: 0 },
        },
        select: { partyId: true, balance: true },
      }),
      this.prisma.balance.count({
        where: {
          companyId,
          balance: { lt: 0 },
        },
      }),
      this.prisma.deferredSale.count({
        where: {
          companyId,
          isDeleted: false,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      this.prisma.installmentContract.count({
        where: {
          companyId,
          isDeleted: false,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      this.prisma.deferredSale.count({
        where: {
          companyId,
          isDeleted: false,
          status: DeferredSaleStatus.OVERDUE,
        },
      }),
      this.prisma.installmentSchedule.count({
        where: {
          companyId,
          status: ScheduleStatus.OVERDUE,
          contract: {
            companyId,
            isDeleted: false,
          },
        },
      }),
      this.prisma.customer.count({
        where: { companyId, isDeleted: false, isActive: true },
      }),
      this.prisma.product.count({
        where: { companyId, isDeleted: false, isActive: true },
      }),
      this.prisma.employee.count({
        where: { companyId, isDeleted: false, isActive: true },
      }),
    ]);

    const totalSales = toDecimal(salesAgg._sum.totalAmount);
    const totalExpenses = toDecimal(expensesAgg._sum.amount);
    const collectionAmount = toDecimal(collectionsDeferredAgg._sum.amount).add(
      toDecimal(collectionsInstallmentAgg._sum.amount),
    );
    const receivables = toDecimal(receivablesAgg._sum.balance);
    const payables = supplierBalances.reduce((acc, row) => {
      const amount = toDecimal(row.balance);
      return amount.lt(0) ? acc.add(amount.abs()) : acc;
    }, new Prisma.Decimal(0));
    const cashNetFlow = collectionAmount.sub(totalExpenses);
    const netProfit = totalSales.sub(totalExpenses);

    const customerBalanceMap = new Map(
      customerCreditRiskBalances.map((row) => [row.partyId, toDecimal(row.balance)]),
    );

    const customersNearCreditLimit = customerCreditRisk.filter((customer) => {
      const balance = customerBalanceMap.get(customer.id) ?? new Prisma.Decimal(0);
      const limit = toDecimal(customer.creditLimit);
      if (limit.lte(0)) return false;
      return balance.div(limit).mul(100).gte(85);
    }).length;

    return {
      company,
      period: {
        dateFrom: toDateOnlyIso(dateFrom),
        dateTo: toDateOnlyIso(dateTo),
        preset,
      },
      kpis: {
        totalSales: totalSales.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        netProfit: netProfit.toFixed(2),
        collectionAmount: collectionAmount.toFixed(2),
        receivables: receivables.toFixed(2),
        payables: payables.toFixed(2),
        cashNetFlow: cashNetFlow.toFixed(2),
      },
      operations: {
        invoicesCount: salesCount,
        deferredSalesCount,
        installmentContractsCount,
        overdueCount: overdueDeferredCount + overdueInstallmentsCount,
        activeCustomers,
        activeProducts,
        activeEmployees,
      },
      alerts: {
        overdueDeferredSales: overdueDeferredCount,
        overdueInstallments: overdueInstallmentsCount,
        customersNearCreditLimit,
        criticalNegativeBalances: negativeBalancesCount,
      },
    };
  }

  async getCharts(
    params: DateRangeParams & {
      granularity: DashboardChartGranularity.DAY | DashboardChartGranularity.MONTH;
    },
  ): Promise<DashboardChartsResult> {
    const { companyId, dateFrom, dateTo, granularity } = params;

    const [salesRows, expenseRows, deferredPayments, installmentPayments, ledgerRows, supplierBalances, receivables] =
      await Promise.all([
        this.prisma.invoice.findMany({
          where: {
            companyId,
            isDeleted: false,
            issueDate: { gte: dateFrom, lte: dateTo },
          },
          select: { issueDate: true, totalAmount: true },
        }),
        this.prisma.expense.findMany({
          where: {
            companyId,
            isDeleted: false,
            expenseDate: { gte: dateFrom, lte: dateTo },
          },
          select: { expenseDate: true, amount: true },
        }),
        this.prisma.deferredPayment.findMany({
          where: {
            companyId,
            paymentDate: { gte: dateFrom, lte: dateTo },
          },
          select: { paymentDate: true, amount: true },
        }),
        this.prisma.installmentPayment.findMany({
          where: {
            companyId,
            paymentDate: { gte: dateFrom, lte: dateTo },
          },
          select: { paymentDate: true, amount: true },
        }),
        this.prisma.ledgerEntry.findMany({
          where: {
            companyId,
            isDeleted: false,
            entryType: 'INVOICE',
            entryDate: { gte: dateFrom, lte: dateTo },
            saleType: { not: null },
          },
          select: { saleType: true, signedAmount: true },
        }),
        this.prisma.balance.findMany({
          where: {
            companyId,
            partyType: PartyType.SUPPLIER,
          },
          select: { balance: true },
        }),
        this.prisma.balance.aggregate({
          where: {
            companyId,
            partyType: PartyType.CUSTOMER,
            balance: { gt: 0 },
          },
          _sum: { balance: true },
        }),
      ]);

    const labels = buildBucketLabels(dateFrom, dateTo, granularity);
    const salesMap = new Map(labels.map((label) => [label, 0]));
    const expensesMap = new Map(labels.map((label) => [label, 0]));
    const collectionsMap = new Map(labels.map((label) => [label, 0]));

    for (const row of salesRows) {
      const key = toBucketLabel(row.issueDate, granularity);
      salesMap.set(key, (salesMap.get(key) ?? 0) + Number(row.totalAmount));
    }

    for (const row of expenseRows) {
      const key = toBucketLabel(row.expenseDate, granularity);
      expensesMap.set(key, (expensesMap.get(key) ?? 0) + Number(row.amount));
    }

    for (const row of deferredPayments) {
      const key = toBucketLabel(row.paymentDate, granularity);
      collectionsMap.set(key, (collectionsMap.get(key) ?? 0) + Number(row.amount));
    }

    for (const row of installmentPayments) {
      const key = toBucketLabel(row.paymentDate, granularity);
      collectionsMap.set(key, (collectionsMap.get(key) ?? 0) + Number(row.amount));
    }

    const salesDistribution = {
      cash: 0,
      deferred: 0,
      installment: 0,
    };

    for (const row of ledgerRows) {
      const amount = Number(row.signedAmount);
      if (row.saleType === SaleType.CASH) salesDistribution.cash += amount;
      if (row.saleType === SaleType.DEFERRED) salesDistribution.deferred += amount;
      if (row.saleType === SaleType.INSTALLMENT) salesDistribution.installment += amount;
    }

    const payables = supplierBalances.reduce((acc, row) => {
      const amount = Number(row.balance);
      return amount < 0 ? acc + Math.abs(amount) : acc;
    }, 0);

    return {
      salesTrend: labels.map((label) => ({
        label,
        value: round2(salesMap.get(label) ?? 0),
      })),
      expensesTrend: labels.map((label) => ({
        label,
        value: round2(expensesMap.get(label) ?? 0),
      })),
      collectionsTrend: labels.map((label) => ({
        label,
        value: round2(collectionsMap.get(label) ?? 0),
      })),
      receivablesVsPayables: {
        receivables: round2(Number(receivables._sum.balance ?? 0)),
        payables: round2(payables),
      },
      salesDistribution: {
        cash: round2(salesDistribution.cash),
        deferred: round2(salesDistribution.deferred),
        installment: round2(salesDistribution.installment),
      },
    };
  }

  async getHighlights(
    params: DateRangeParams & { limit: number },
  ): Promise<DashboardHighlightsResult> {
    const { companyId, dateFrom, dateTo, limit } = params;

    const [customerRows, balances, productRows, invoiceRows, deferredPaymentRows, installmentPaymentRows, users] =
      await Promise.all([
        this.prisma.invoice.groupBy({
          by: ['partyId', 'partyName'],
          where: {
            companyId,
            isDeleted: false,
            partyType: PartyType.CUSTOMER,
            issueDate: { gte: dateFrom, lte: dateTo },
          },
          _sum: { totalAmount: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: limit,
        }),
        this.prisma.balance.findMany({
          where: {
            companyId,
            partyType: PartyType.CUSTOMER,
          },
          select: { partyId: true, balance: true },
        }),
        this.prisma.invoiceItem.groupBy({
          by: ['productId', 'description'],
          where: {
            invoice: {
              companyId,
              isDeleted: false,
              issueDate: { gte: dateFrom, lte: dateTo },
            },
          },
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { total: 'desc' } },
          take: limit,
        }),
        this.prisma.invoice.groupBy({
          by: ['createdById'],
          where: {
            companyId,
            isDeleted: false,
            issueDate: { gte: dateFrom, lte: dateTo },
          },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        this.prisma.deferredPayment.groupBy({
          by: ['createdById'],
          where: {
            companyId,
            paymentDate: { gte: dateFrom, lte: dateTo },
          },
          _sum: { amount: true },
        }),
        this.prisma.installmentPayment.groupBy({
          by: ['createdById'],
          where: {
            companyId,
            paymentDate: { gte: dateFrom, lte: dateTo },
          },
          _sum: { amount: true },
        }),
        this.prisma.user.findMany({
          where: { companyId, isDeleted: false },
          select: { id: true, fullName: true, email: true },
        }),
      ]);

    const balanceMap = new Map(
      balances.map((row) => [row.partyId, toDecimal(row.balance).toFixed(2)]),
    );

    const userMap = new Map(
      users.map((user) => [user.id, user.fullName?.trim() || user.email]),
    );

    const collectionsMap = new Map<string, Prisma.Decimal>();

    for (const row of deferredPaymentRows) {
      collectionsMap.set(
        row.createdById,
        (collectionsMap.get(row.createdById) ?? new Prisma.Decimal(0)).add(
          toDecimal(row._sum.amount),
        ),
      );
    }

    for (const row of installmentPaymentRows) {
      collectionsMap.set(
        row.createdById,
        (collectionsMap.get(row.createdById) ?? new Prisma.Decimal(0)).add(
          toDecimal(row._sum.amount),
        ),
      );
    }

    const topEmployees = invoiceRows
      .map((row) => ({
        id: row.createdById,
        name: userMap.get(row.createdById) ?? row.createdById,
        invoicesCount: row._count._all,
        salesAmount: toDecimal(row._sum.totalAmount).toFixed(2),
        collectionsAmount: (collectionsMap.get(row.createdById) ?? new Prisma.Decimal(0)).toFixed(2),
      }))
      .sort((a, b) => Number(b.salesAmount) - Number(a.salesAmount))
      .slice(0, limit);

    return {
      topCustomers: customerRows.map((row) => ({
        id: row.partyId,
        name: row.partyName,
        totalSales: toDecimal(row._sum.totalAmount).toFixed(2),
        outstandingBalance: balanceMap.get(row.partyId) ?? '0.00',
      })),
      topProducts: productRows.map((row) => ({
        id: row.productId,
        name: row.description,
        quantitySold: toDecimal(row._sum.quantity).toFixed(3),
        salesAmount: toDecimal(row._sum.total).toFixed(2),
      })),
      topEmployees,
    };
  }

  async getAlerts(
    params: DateRangeParams & { limit: number },
  ): Promise<DashboardAlertsResult> {
    const { companyId, dateTo, limit } = params;
    const asOfDate = dateTo;

    const [overdueDeferred, overdueSchedules, customers, customerBalances, supplierBalances] =
      await Promise.all([
        this.prisma.deferredSale.findMany({
          where: {
            companyId,
            isDeleted: false,
            status: DeferredSaleStatus.OVERDUE,
            dueDate: { lt: asOfDate },
          },
          select: {
            id: true,
            referenceNumber: true,
            partyType: true,
            partyId: true,
            dueDate: true,
            totalAmount: true,
            paidAmount: true,
          },
          orderBy: { dueDate: 'asc' },
          take: limit * 3,
        }),
        this.prisma.installmentSchedule.findMany({
          where: {
            companyId,
            status: ScheduleStatus.OVERDUE,
            dueDate: { lt: asOfDate },
            contract: { companyId, isDeleted: false },
          },
          select: {
            id: true,
            dueDate: true,
            amount: true,
            paidAmount: true,
            installmentNumber: true,
            contract: {
              select: {
                id: true,
                contractNumber: true,
                partyType: true,
                partyId: true,
              },
            },
          },
          orderBy: { dueDate: 'asc' },
          take: limit * 3,
        }),
        this.prisma.customer.findMany({
          where: {
            companyId,
            isDeleted: false,
            isActive: true,
            creditLimit: { not: null, gt: new Prisma.Decimal(0) },
          },
          select: { id: true, name: true, creditLimit: true },
        }),
        this.prisma.balance.findMany({
          where: {
            companyId,
            partyType: PartyType.CUSTOMER,
            balance: { gt: 0 },
          },
          select: { partyId: true, balance: true },
        }),
        this.prisma.balance.findMany({
          where: {
            companyId,
            partyType: PartyType.SUPPLIER,
            balance: { lt: 0 },
          },
          select: { partyId: true, balance: true },
        }),
      ]);

    const partyNames = await this.batchResolvePartyNames(companyId, [
      ...overdueDeferred.map((row) => ({
        partyType: row.partyType,
        partyId: row.partyId,
      })),
      ...overdueSchedules.map((row) => ({
        partyType: row.contract.partyType,
        partyId: row.contract.partyId,
      })),
      ...supplierBalances.map((row) => ({
        partyType: PartyType.SUPPLIER,
        partyId: row.partyId,
      })),
    ]);

    const items: DashboardAlertItem[] = [];

    for (const row of overdueDeferred) {
      const remaining = toDecimal(row.totalAmount).sub(toDecimal(row.paidAmount));
      items.push({
        type: 'OVERDUE_DEFERRED',
        severity: remaining.gte(10000) ? 'high' : 'medium',
        title: `Deferred sale overdue: ${row.referenceNumber}`,
        description: `${partyNames.get(row.partyId)?.name ?? 'Unknown party'} has an overdue deferred balance.`,
        entityId: row.id,
        entityType: row.partyType,
        amount: remaining.toFixed(2),
        dueDate: toDateOnlyIso(row.dueDate),
      });
    }

    for (const row of overdueSchedules) {
      const remaining = toDecimal(row.amount).sub(toDecimal(row.paidAmount));
      items.push({
        type: 'OVERDUE_INSTALLMENT',
        severity: remaining.gte(5000) ? 'high' : 'medium',
        title: `Installment overdue: ${row.contract.contractNumber}`,
        description: `${partyNames.get(row.contract.partyId)?.name ?? 'Unknown party'} has overdue installment #${row.installmentNumber}.`,
        entityId: row.contract.id,
        entityType: row.contract.partyType,
        amount: remaining.toFixed(2),
        dueDate: toDateOnlyIso(row.dueDate),
      });
    }

    const balanceMap = new Map(
      customerBalances.map((row) => [row.partyId, toDecimal(row.balance)]),
    );

    for (const customer of customers) {
      const balance = balanceMap.get(customer.id) ?? new Prisma.Decimal(0);
      const creditLimit = toDecimal(customer.creditLimit);
      if (creditLimit.lte(0)) continue;
      const usage = balance.div(creditLimit).mul(100);
      if (usage.lt(85)) continue;

      items.push({
        type: 'CREDIT_LIMIT_RISK',
        severity: usage.gte(100) ? 'high' : 'medium',
        title: `Credit limit risk: ${customer.name}`,
        description: `${customer.name} reached ${usage.toFixed(2)}% of the configured credit limit.`,
        entityId: customer.id,
        entityType: PartyType.CUSTOMER,
        amount: balance.toFixed(2),
      });
    }

    for (const row of supplierBalances) {
      const amount = toDecimal(row.balance).abs();
      if (amount.lt(10000)) continue;
      items.push({
        type: 'CRITICAL_PAYABLE',
        severity: 'high',
        title: `Large supplier payable`,
        description: `${partyNames.get(row.partyId)?.name ?? 'Unknown supplier'} has a large payable balance.`,
        entityId: row.partyId,
        entityType: PartyType.SUPPLIER,
        amount: amount.toFixed(2),
      });
    }

    const severityOrder: Record<DashboardAlertItem['severity'], number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    items.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return Number(b.amount ?? 0) - Number(a.amount ?? 0);
    });

    return { items: items.slice(0, limit) };
  }

  private async batchResolvePartyNames(
    companyId: string,
    refs: Array<{ partyType: PartyType; partyId: string }>,
  ) {
    const grouped = new Map<PartyType, Set<string>>();

    for (const ref of refs) {
      if (!grouped.has(ref.partyType)) grouped.set(ref.partyType, new Set());
      grouped.get(ref.partyType)!.add(ref.partyId);
    }

    const [customers, suppliers, employees] = await Promise.all([
      grouped.has(PartyType.CUSTOMER)
        ? this.prisma.customer.findMany({
            where: {
              companyId,
              isDeleted: false,
              id: { in: [...grouped.get(PartyType.CUSTOMER)!] },
            },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      grouped.has(PartyType.SUPPLIER)
        ? this.prisma.supplier.findMany({
            where: {
              companyId,
              isDeleted: false,
              id: { in: [...grouped.get(PartyType.SUPPLIER)!] },
            },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      grouped.has(PartyType.EMPLOYEE)
        ? this.prisma.employee.findMany({
            where: {
              companyId,
              isDeleted: false,
              id: { in: [...grouped.get(PartyType.EMPLOYEE)!] },
            },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    return new Map(
      [...customers, ...suppliers, ...employees].map((row) => [
        row.id,
        { name: row.name },
      ]),
    );
  }
}

function toDecimal(value: Prisma.Decimal | string | number | null | undefined) {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value.toString());
}

function toDateOnlyIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toBucketLabel(
  date: Date,
  granularity: DashboardChartGranularity.DAY | DashboardChartGranularity.MONTH,
) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');

  if (granularity === DashboardChartGranularity.MONTH) {
    return `${year}-${month}`;
  }

  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildBucketLabels(
  from: Date,
  to: Date,
  granularity: DashboardChartGranularity.DAY | DashboardChartGranularity.MONTH,
) {
  const labels: string[] = [];
  const cursor = new Date(from);

  if (granularity === DashboardChartGranularity.MONTH) {
    cursor.setUTCDate(1);
    while (cursor <= to) {
      labels.push(toBucketLabel(cursor, granularity));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return labels;
  }

  while (cursor <= to) {
    labels.push(toBucketLabel(cursor, granularity));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return labels;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}


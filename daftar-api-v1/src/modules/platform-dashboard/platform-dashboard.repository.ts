import { Injectable } from '@nestjs/common';
import {
  BillingCycle,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  PlatformDashboardChartGranularity,
  PlatformDashboardPeriodPreset,
} from './dto/query-platform-dashboard.dto';

interface OverviewParams {
  dateFrom: Date;
  dateTo: Date;
  preset: PlatformDashboardPeriodPreset | 'custom';
}

interface ChartsParams extends OverviewParams {
  granularity: PlatformDashboardChartGranularity.DAY | PlatformDashboardChartGranularity.MONTH;
}

interface HealthParams extends OverviewParams {
  limit: number;
}

type LatestSubscriptionStatusRow = {
  status: SubscriptionStatus;
  count: bigint | number;
};

type BucketCountRow = {
  bucket: Date | string;
  count: bigint | number;
};

type RevenueBucketRow = {
  bucket: Date | string;
  total: Prisma.Decimal | number | string | null;
};

type PlanDistributionRow = {
  name: string;
  count: bigint | number;
  revenue: Prisma.Decimal | number | string | null;
};

type StatusDistributionRow = {
  status: SubscriptionStatus;
  count: bigint | number;
};

@Injectable()
export class PlatformDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview({ dateFrom, dateTo, preset }: OverviewParams) {
    const renewSoonDate = new Date(dateTo);
    renewSoonDate.setDate(renewSoonDate.getDate() + 30);

    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      totalPlans,
      activePlans,
      companiesCreatedInRange,
      currentSubscriptionStatuses,
      revenueSummary,
    ] = await Promise.all([
      this.prisma.company.count({
        where: { isDeleted: false },
      }),
      this.prisma.company.count({
        where: { isDeleted: false, isActive: true },
      }),
      this.prisma.user.count({
        where: { isDeleted: false, role: { not: 'SUPER_ADMIN' } },
      }),
      this.prisma.plan.count(),
      this.prisma.plan.count({ where: { isActive: true } }),
      this.prisma.company.count({
        where: {
          isDeleted: false,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      this.getLatestSubscriptionStatusCounts(),
      this.prisma.subscriptionPayment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          OR: [
            { paymentDate: { gte: dateFrom, lte: dateTo } },
            {
              paymentDate: null,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          ],
        },
        _sum: { amount: true },
      }),
    ]);

    const statusMap = this.mapStatusCounts(currentSubscriptionStatuses);
    const monthlyRevenue = toNumber(revenueSummary._sum.amount);

    return {
      period: {
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        preset,
      },
      kpis: {
        totalCompanies,
        activeCompanies,
        suspendedCompanies: statusMap.SUSPENDED ?? 0,
        paidCompanies: statusMap.ACTIVE ?? 0,
        trialCompanies: statusMap.TRIAL ?? 0,
        expiredCompanies: statusMap.EXPIRED ?? 0,
        renewSoonCompanies: await this.prisma.companySubscription.count({
          where: {
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
            endDate: {
              gte: dateTo,
              lte: renewSoonDate,
            },
          },
        }),
        totalUsers,
        totalPlans,
        activePlans,
      },
      trends: {
        companiesCreatedInRange,
        subscriptionsCreatedInRange:
          (statusMap.ACTIVE ?? 0) + (statusMap.TRIAL ?? 0) + (statusMap.SUSPENDED ?? 0),
        revenueCollected: monthlyRevenue,
        annualRunRate: monthlyRevenue * 12,
      },
    };
  }

  async getCharts({ dateFrom, dateTo, preset, granularity }: ChartsParams) {
    const [companiesGrowth, subscriptionsGrowth, revenueTrend, planDistribution, statusDistribution] =
      await Promise.all([
        this.getCompanyGrowth(dateFrom, dateTo, granularity),
        this.getSubscriptionGrowth(dateFrom, dateTo, granularity),
        this.getRevenueTrend(dateFrom, dateTo, granularity),
        this.getPlanDistribution(),
        this.getLatestSubscriptionStatusCounts(),
      ]);

    return {
      period: {
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        preset,
        granularity,
      },
      companiesGrowth,
      subscriptionsGrowth,
      revenueTrend,
      planDistribution: planDistribution.map((item) => ({
        label: item.name,
        companiesCount: toNumber(item.count),
        revenue: toNumber(item.revenue),
      })),
      subscriptionStatusDistribution: statusDistribution.map((item) => ({
        label: item.status,
        value: toNumber(item.count),
      })),
    };
  }

  async getHealth({ dateFrom, dateTo, preset, limit }: HealthParams) {
    const [recentCompanies, expiringSubscriptions, planWatchlist] = await Promise.all([
      this.prisma.company.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          users: {
            where: { role: 'OWNER', isDeleted: false },
            select: { email: true, fullName: true },
            take: 1,
          },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              plan: { select: { name: true, billingCycle: true } },
            },
          },
          _count: {
            select: {
              users: true,
              businessPartners: true,
              accountingJournalEntries: true,
            },
          },
        },
      }),
      this.prisma.companySubscription.findMany({
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
          endDate: { gte: dateTo },
        },
        orderBy: { endDate: 'asc' },
        take: limit,
        include: {
          company: {
            select: { id: true, name: true, isActive: true },
          },
          plan: {
            select: { name: true, billingCycle: true },
          },
        },
      }),
      this.getPlanDistribution(limit),
    ]);

    return {
      period: {
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        preset,
      },
      recentCompanies: recentCompanies.map((company) => ({
        id: company.id,
        name: company.name,
        createdAt: company.createdAt.toISOString(),
        ownerEmail: company.users[0]?.email ?? null,
        ownerName: company.users[0]?.fullName ?? null,
        usersCount: company._count.users,
        customersCount: company._count.businessPartners,
        ledgerEntriesCount: company._count.accountingJournalEntries,
        subscriptionStatus: company.subscriptions[0]?.status ?? null,
        planName: company.subscriptions[0]?.plan.name ?? null,
      })),
      expiringSubscriptions: expiringSubscriptions.map((subscription) => ({
        companyId: subscription.company.id,
        companyName: subscription.company.name,
        planName: subscription.plan.name,
        billingCycle: subscription.plan.billingCycle,
        status: subscription.status,
        endDate: subscription.endDate.toISOString(),
        daysLeft: diffInDays(subscription.endDate, dateTo),
        companyActive: subscription.company.isActive,
      })),
      planWatchlist: planWatchlist.map((item) => ({
        planName: item.name,
        companiesCount: toNumber(item.count),
        revenue: toNumber(item.revenue),
      })),
    };
  }

  private async getCompanyGrowth(
    dateFrom: Date,
    dateTo: Date,
    granularity: PlatformDashboardChartGranularity.DAY | PlatformDashboardChartGranularity.MONTH,
  ) {
    const rows = await this.prisma.$queryRaw<BucketCountRow[]>`
      SELECT ${bucketSql('c."createdAt"', granularity)} AS bucket,
             COUNT(*)::bigint AS count
      FROM "Company" c
      WHERE c."isDeleted" = false
        AND c."createdAt" >= ${dateFrom}
        AND c."createdAt" <= ${dateTo}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    return rows.map((row) => ({
      label: formatBucketLabel(row.bucket, granularity),
      value: toNumber(row.count),
    }));
  }

  private async getSubscriptionGrowth(
    dateFrom: Date,
    dateTo: Date,
    granularity: PlatformDashboardChartGranularity.DAY | PlatformDashboardChartGranularity.MONTH,
  ) {
    const rows = await this.prisma.$queryRaw<BucketCountRow[]>`
      SELECT ${bucketSql('cs."createdAt"', granularity)} AS bucket,
             COUNT(*)::bigint AS count
      FROM "CompanySubscription" cs
      WHERE cs."createdAt" >= ${dateFrom}
        AND cs."createdAt" <= ${dateTo}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    return rows.map((row) => ({
      label: formatBucketLabel(row.bucket, granularity),
      value: toNumber(row.count),
    }));
  }

  private async getRevenueTrend(
    dateFrom: Date,
    dateTo: Date,
    granularity: PlatformDashboardChartGranularity.DAY | PlatformDashboardChartGranularity.MONTH,
  ) {
    const rows = await this.prisma.$queryRaw<RevenueBucketRow[]>`
      SELECT ${bucketSql('COALESCE(sp."paymentDate", sp."createdAt")', granularity)} AS bucket,
             COALESCE(SUM(sp."amount"), 0) AS total
      FROM "SubscriptionPayment" sp
      WHERE sp."status" = ${PaymentStatus.PAID}::"PaymentStatus"
        AND COALESCE(sp."paymentDate", sp."createdAt") >= ${dateFrom}
        AND COALESCE(sp."paymentDate", sp."createdAt") <= ${dateTo}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    return rows.map((row) => ({
      label: formatBucketLabel(row.bucket, granularity),
      value: toNumber(row.total),
    }));
  }

  private async getPlanDistribution(limit?: number) {
    const rows = await this.prisma.$queryRaw<PlanDistributionRow[]>`
      WITH latest_subscriptions AS (
        SELECT DISTINCT ON (cs."companyId")
          cs."companyId",
          cs."planId",
          cs."status"
        FROM "CompanySubscription" cs
        ORDER BY cs."companyId", cs."createdAt" DESC
      )
      SELECT p."name",
             COUNT(*)::bigint AS count,
             COALESCE(SUM(CASE p."billingCycle"
               WHEN ${BillingCycle.MONTHLY}::"BillingCycle" THEN p."price"
               ELSE p."price" / 12
             END), 0) AS revenue
      FROM latest_subscriptions ls
      INNER JOIN "Plan" p ON p."id" = ls."planId"
      WHERE ls."status" IN (
        ${SubscriptionStatus.ACTIVE}::"SubscriptionStatus",
        ${SubscriptionStatus.TRIAL}::"SubscriptionStatus",
        ${SubscriptionStatus.SUSPENDED}::"SubscriptionStatus"
      )
      GROUP BY p."name", p."price", p."billingCycle"
      ORDER BY count DESC, p."name" ASC
      ${typeof limit === 'number' ? Prisma.sql`LIMIT ${limit}` : Prisma.empty}
    `;

    return rows;
  }

  private async getLatestSubscriptionStatusCounts() {
    return this.prisma.$queryRaw<LatestSubscriptionStatusRow[]>`
      WITH latest_subscriptions AS (
        SELECT DISTINCT ON (cs."companyId")
          cs."companyId",
          cs."status"
        FROM "CompanySubscription" cs
        ORDER BY cs."companyId", cs."createdAt" DESC
      )
      SELECT ls."status", COUNT(*)::bigint AS count
      FROM latest_subscriptions ls
      GROUP BY ls."status"
    `;
  }

  private mapStatusCounts(rows: LatestSubscriptionStatusRow[]) {
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = toNumber(row.count);
      return acc;
    }, {});
  }
}

function bucketSql(
  column: string,
  granularity: PlatformDashboardChartGranularity.DAY | PlatformDashboardChartGranularity.MONTH,
) {
  const interval =
    granularity === PlatformDashboardChartGranularity.MONTH ? 'month' : 'day';

  return Prisma.raw(`DATE_TRUNC('${interval}', ${column})`);
}

function toNumber(value: Prisma.Decimal | string | number | bigint | null | undefined) {
  if (value == null) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return value.toNumber();
}

function formatBucketLabel(
  bucket: string | Date,
  granularity: PlatformDashboardChartGranularity.DAY | PlatformDashboardChartGranularity.MONTH,
) {
  const date = bucket instanceof Date ? bucket : new Date(bucket);
  if (Number.isNaN(date.getTime())) {
    return String(bucket);
  }

  if (granularity === PlatformDashboardChartGranularity.MONTH) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  return date.toISOString().slice(0, 10);
}

function diffInDays(target: Date, base: Date) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.max(
    0,
    Math.ceil((target.getTime() - base.getTime()) / millisecondsPerDay),
  );
}

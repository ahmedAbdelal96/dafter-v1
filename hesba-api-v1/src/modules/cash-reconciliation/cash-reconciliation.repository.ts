import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CashReconciliationStatus, Prisma } from '@prisma/client';

type DraftPayload = {
  openingCash: number;
  cashSalesOutsideSystem: number;
  cashExpensesOutsideSystem: number;
  actualCashCounted: number;
  expectedCash: number;
  variance: number;
  note?: string | null;
};

@Injectable()
export class CashReconciliationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildHistoryWhere(params: {
    companyId: string;
    status?: CashReconciliationStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }): Prisma.CashReconciliationDailyWhereInput {
    const where: Prisma.CashReconciliationDailyWhereInput = {
      companyId: params.companyId,
      ...(params.status ? { status: params.status } : {}),
    };

    if (params.dateFrom || params.dateTo) {
      where.businessDate = {
        ...(params.dateFrom ? { gte: params.dateFrom } : {}),
        ...(params.dateTo ? { lte: params.dateTo } : {}),
      };
    }

    return where;
  }

  async getCompanyCashMode(companyId: string) {
    return this.prisma.company.findFirst({
      where: { id: companyId, isDeleted: false },
      select: { id: true, cashReconciliationMode: true },
    });
  }

  async findByCompanyAndBusinessDate(companyId: string, businessDate: Date) {
    return this.prisma.cashReconciliationDaily.findFirst({
      where: { companyId, businessDate },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.cashReconciliationDaily.findFirst({
      where: { id, companyId },
    });
  }

  async findHistory(params: {
    companyId: string;
    page: number;
    limit: number;
    status?: CashReconciliationStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where = this.buildHistoryWhere(params);
    const skip = (params.page - 1) * params.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.cashReconciliationDaily.findMany({
        where,
        orderBy: [{ businessDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: params.limit,
      }),
      this.prisma.cashReconciliationDaily.count({ where }),
    ]);

    return {
      items,
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async getSummary(params: {
    companyId: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const baseWhere = this.buildHistoryWhere({
      companyId: params.companyId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });

    const closedWhere: Prisma.CashReconciliationDailyWhereInput = {
      ...baseWhere,
      status: CashReconciliationStatus.CLOSED,
    };

    const [totalRecords, draftCount, closedCount, totalVarianceAgg, positiveVarianceDays, negativeVarianceDays, latestClosedRecord] =
      await this.prisma.$transaction([
        this.prisma.cashReconciliationDaily.count({ where: baseWhere }),
        this.prisma.cashReconciliationDaily.count({
          where: { ...baseWhere, status: CashReconciliationStatus.DRAFT },
        }),
        this.prisma.cashReconciliationDaily.count({ where: closedWhere }),
        this.prisma.cashReconciliationDaily.aggregate({
          where: closedWhere,
          _sum: { variance: true },
        }),
        this.prisma.cashReconciliationDaily.count({
          where: {
            ...closedWhere,
            variance: { gt: new Prisma.Decimal(0) },
          },
        }),
        this.prisma.cashReconciliationDaily.count({
          where: {
            ...closedWhere,
            variance: { lt: new Prisma.Decimal(0) },
          },
        }),
        this.prisma.cashReconciliationDaily.findFirst({
          where: closedWhere,
          orderBy: [{ businessDate: 'desc' }, { closedAt: 'desc' }],
        }),
      ]);

    return {
      totalRecords,
      draftCount,
      closedCount,
      totalVariance: totalVarianceAgg._sum.variance ?? new Prisma.Decimal(0),
      positiveVarianceDays,
      negativeVarianceDays,
      latestClosedRecord,
    };
  }

  async createDraft(companyId: string, businessDate: Date, actorUserId: string, data: DraftPayload) {
    return this.prisma.cashReconciliationDaily.create({
      data: {
        companyId,
        businessDate,
        status: CashReconciliationStatus.DRAFT,
        openingCash: data.openingCash,
        cashSalesOutsideSystem: data.cashSalesOutsideSystem,
        cashExpensesOutsideSystem: data.cashExpensesOutsideSystem,
        actualCashCounted: data.actualCashCounted,
        expectedCash: data.expectedCash,
        variance: data.variance,
        note: data.note ?? null,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
    });
  }

  async updateDraft(id: string, companyId: string, actorUserId: string, data: Partial<DraftPayload>) {
    await this.prisma.cashReconciliationDaily.updateMany({
      where: { id, companyId, status: CashReconciliationStatus.DRAFT },
      data: {
        ...(data.openingCash !== undefined ? { openingCash: data.openingCash } : {}),
        ...(data.cashSalesOutsideSystem !== undefined
          ? { cashSalesOutsideSystem: data.cashSalesOutsideSystem }
          : {}),
        ...(data.cashExpensesOutsideSystem !== undefined
          ? { cashExpensesOutsideSystem: data.cashExpensesOutsideSystem }
          : {}),
        ...(data.actualCashCounted !== undefined ? { actualCashCounted: data.actualCashCounted } : {}),
        ...(data.expectedCash !== undefined ? { expectedCash: data.expectedCash } : {}),
        ...(data.variance !== undefined ? { variance: data.variance } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
        updatedByUserId: actorUserId,
      },
    });

    return this.findById(companyId, id);
  }

  async closeDraft(id: string, companyId: string, actorUserId: string) {
    const now = new Date();
    await this.prisma.cashReconciliationDaily.updateMany({
      where: { id, companyId, status: CashReconciliationStatus.DRAFT },
      data: {
        status: CashReconciliationStatus.CLOSED,
        closedByUserId: actorUserId,
        closedAt: now,
        updatedByUserId: actorUserId,
      },
    });

    return this.findById(companyId, id);
  }
}

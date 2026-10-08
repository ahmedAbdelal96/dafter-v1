// ============================================
// Companies Repository
// ============================================
// Lightweight Prisma wrapper scoped to the
// company-self-management feature. Separate from
// PlatformRepository (which is SUPER_ADMIN only).
// ============================================

import { Injectable } from '@nestjs/common';
import { CashReconciliationMode } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(companyId: string) {
    return this.prisma.company.findFirst({
      where: { id: companyId, isDeleted: false },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        currencyCode: true,
        isActive: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            endDate: true,
            autoRenew: true,
            plan: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  async update(
    companyId: string,
    data: { name?: string; phone?: string; address?: string; currencyCode?: string },
    version: number,
  ) {
    return this.prisma.company.update({
      where: { id: companyId, version, isDeleted: false },
      data: { ...data, version: { increment: 1 } },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        currencyCode: true,
        isActive: true,
        version: true,
        updatedAt: true,
      },
    });
  }

  async getCashReconciliationMode(companyId: string) {
    return this.prisma.company.findFirst({
      where: { id: companyId, isDeleted: false },
      select: {
        id: true,
        cashReconciliationMode: true,
        cashModeUpdatedByUserId: true,
        cashModeUpdatedAt: true,
      },
    });
  }

  async updateCashReconciliationMode(
    companyId: string,
    mode: CashReconciliationMode,
    actorUserId: string,
  ) {
    return this.prisma.company.update({
      where: { id: companyId, isDeleted: false },
      data: {
        cashReconciliationMode: mode,
        cashModeUpdatedByUserId: actorUserId,
        cashModeUpdatedAt: new Date(),
        version: { increment: 1 },
      },
      select: {
        id: true,
        cashReconciliationMode: true,
        cashModeUpdatedByUserId: true,
        cashModeUpdatedAt: true,
        version: true,
      },
    });
  }
}

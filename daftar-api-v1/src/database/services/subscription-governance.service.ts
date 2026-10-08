import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TxOrClient = Prisma.TransactionClient | PrismaClient;

/**
 * Centralizes subscription selection rules used across modules.
 *
 * Why this exists:
 * - Prevent divergent "current subscription" logic in different repositories/guards.
 * - Keep status semantics explicit and easy to evolve.
 */
@Injectable()
export class SubscriptionGovernanceService {
  static readonly LIVE_STATUSES: SubscriptionStatus[] = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIAL,
    SubscriptionStatus.SUSPENDED,
  ];

  static readonly ENTITLED_STATUSES: SubscriptionStatus[] = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIAL,
  ];

  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient): TxOrClient {
    return tx ?? this.prisma;
  }

  /**
   * Selects a subscription for runtime access checks:
   * 1) Prefer a live subscription (ACTIVE/TRIAL/SUSPENDED)
   * 2) Fallback to latest historical record (EXPIRED/DISABLED/etc.)
   */
  async findSubscriptionForAccess(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);

    const live = await db.companySubscription.findFirst({
      where: {
        companyId,
        status: { in: SubscriptionGovernanceService.LIVE_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            billingCycle: true,
            currencyCode: true,
          },
        },
      },
    });

    if (live) return live;

    return db.companySubscription.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            billingCycle: true,
            currencyCode: true,
          },
        },
      },
    });
  }

  /**
   * Returns current plan limits from an entitled subscription (ACTIVE/TRIAL).
   */
  async findEntitledSubscriptionPlanLimits(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);

    return db.companySubscription.findFirst({
      where: {
        companyId,
        status: { in: SubscriptionGovernanceService.ENTITLED_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        endDate: true,
        plan: {
          select: {
            maxUsers: true,
            maxCustomers: true,
            maxSuppliers: true,
            maxEmployees: true,
            maxLedgerEntries: true,
          },
        },
      },
    });
  }

  async findLatestSubscriptionWithPlan(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);
    return db.companySubscription.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            billingCycle: true,
            currencyCode: true,
          },
        },
        company: true,
      },
    });
  }

  async findEntitledSubscriptionWithPlan(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);
    return db.companySubscription.findFirst({
      where: {
        companyId,
        status: { in: SubscriptionGovernanceService.ENTITLED_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            billingCycle: true,
            currencyCode: true,
          },
        },
      },
    });
  }

  async findSubscriptionForExtension(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);
    return db.companySubscription.findFirst({
      where: {
        companyId,
        status: { not: SubscriptionStatus.DISABLED },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Serializes subscription mutations per company to avoid race conditions.
   */
  async lockCompanyForSubscriptionMutation(
    companyId: string,
    tx: Prisma.TransactionClient,
  ) {
    await tx.$queryRaw`SELECT id FROM "Company" WHERE id = ${companyId} FOR UPDATE`;
  }
}

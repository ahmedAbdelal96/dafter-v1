// ============================================
// Platform Repository — Database Layer
// ============================================
// Handles all Prisma queries for platform-level operations.
// Only SUPER_ADMIN can use these data paths.
//
// Note on AuditLog:
//   Platform operations that affect a specific company log their
//   actions using that company's ID. Platform-wide operations
//   (like plan CRUD) do not produce per-company audit logs.
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SubscriptionGovernanceService } from '../../database/services/subscription-governance.service';
import {
  UserRole,
  UserStatus,
  SubscriptionStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class PlatformRepository {
  private readonly logger = new Logger(PlatformRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGovernance: SubscriptionGovernanceService,
  ) {}

  // ══════════════════════════════════════════════
  // PLANS
  // ══════════════════════════════════════════════

  /**
   * Create a new subscription plan
   */
  async createPlan(data: {
    name: string;
    price: number;
    currencyCode?: string;
    billingCycle: string;
    maxUsers?: number;
    maxCustomers?: number;
    maxSuppliers?: number;
    maxEmployees?: number;
    maxLedgerEntries?: number;
    features?: string[];
    isActive?: boolean;
  }) {
    return this.prisma.plan.create({
      data: {
        name: data.name.toUpperCase().trim(),
        price: data.price,
        currencyCode: data.currencyCode ?? 'EGP',
        billingCycle: data.billingCycle as any,
        maxUsers: data.maxUsers ?? null,
        maxCustomers: data.maxCustomers ?? null,
        maxSuppliers: data.maxSuppliers ?? null,
        maxEmployees: data.maxEmployees ?? null,
        maxLedgerEntries: data.maxLedgerEntries
          ? BigInt(data.maxLedgerEntries)
          : null,
        features: data.features ? JSON.stringify(data.features) : '[]',
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Find all plans (active first)
   *
   * Performance: Plans table is small — no pagination needed
   */
  async findPlans(includeInactive = false) {
    return this.prisma.plan.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { price: 'asc' }],
    });
  }

  /**
   * Find plan by ID
   */
  async findPlanById(planId: string) {
    return this.prisma.plan.findUnique({
      where: { id: planId },
    });
  }

  /**
   * Find plan by name (for uniqueness check)
   */
  async findPlanByName(name: string) {
    return this.prisma.plan.findUnique({
      where: { name: name.toUpperCase().trim() },
    });
  }

  /**
   * Update a plan's configuration
   * Note: Changing limits on an active plan affects all existing subscribers
   */
  async updatePlan(planId: string, data: Prisma.PlanUpdateInput) {
    return this.prisma.plan.update({
      where: { id: planId },
      data,
    });
  }

  // ══════════════════════════════════════════════
  // COMPANIES
  // ══════════════════════════════════════════════

  /**
   * Create company + owner user + subscription in one atomic transaction.
   *
   * Design decisions:
   * - Password hashing is done BEFORE calling this method (in the use case).
   * - The subscription status is set to ACTIVE (not TRIAL) since Super Admin
   *   is manually assigning a plan with an explicit end date.
   * - An audit log is created within the transaction using the new company's ID.
   */
  async createCompanyWithOwner(data: {
    // Company
    companyName: string;
    companyPhone?: string;
    companyAddress?: string;
    currencyCode?: string;
    // Owner
    ownerFullName: string;
    ownerEmail: string;
    ownerPasswordHash: string;
    ownerPhone?: string;
    // Subscription
    planId: string;
    subscriptionEndDate: Date;
    subscriptionStatus: SubscriptionStatus;
    paymentStatus: PaymentStatus;
    autoRenew: boolean;
    // Actor
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Create the company
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          phone: data.companyPhone,
          address: data.companyAddress,
          currencyCode: data.currencyCode ?? 'EGP',
          isActive: true,
        },
      });

      // Step 2: Create the owner user linked to the company
      const owner = await tx.user.create({
        data: {
          email: data.ownerEmail.toLowerCase().trim(),
          passwordHash: data.ownerPasswordHash,
          fullName: data.ownerFullName,
          phone: data.ownerPhone,
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
          companyId: company.id,
        },
      });

      // Step 3: Create the subscription (ACTIVE, not TRIAL)
      const subscription = await tx.companySubscription.create({
        data: {
          companyId: company.id,
          planId: data.planId,
          status: data.subscriptionStatus,
          startDate: new Date(),
          endDate: data.subscriptionEndDate,
          autoRenew: data.autoRenew,
          paymentStatus: data.paymentStatus,
        },
      });

      // Step 4: Audit log — use new company's ID as context
      await tx.auditLog.create({
        data: {
          companyId: company.id,
          actorUserId: data.actorUserId,
          action: 'platform.create-company',
          entityType: 'company',
          entityId: company.id,
          metadata: {
            companyName: company.name,
            ownerEmail: owner.email,
            planId: data.planId,
            subscriptionEndsAt: data.subscriptionEndDate.toISOString(),
            subscriptionStatus: data.subscriptionStatus,
            paymentStatus: data.paymentStatus,
            createdBySuperAdmin: true,
          },
        },
      });

      return { company, owner, subscription };
    });
  }

  /**
   * Find companies with pagination + search + subscription status filter
   *
   * Performance: Uses parallel count + data queries.
   * Includes latest subscription for status display.
   */
  async findCompanies(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    includeArchived?: boolean;
    archivedOnly?: boolean;
    subscriptionStatus?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page,
      limit,
      search,
      isActive,
      includeArchived,
      archivedOnly,
      subscriptionStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CompanyWhereInput = {
      ...(archivedOnly ? { isDeleted: true } : {}),
      ...(!archivedOnly && !includeArchived ? { isDeleted: false } : {}),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
      // Filter by subscription status using nested relation
      ...(subscriptionStatus && {
        subscriptions: {
          some: {
            status: subscriptionStatus as any,
          },
        },
      }),
    };

    // Parallel queries for performance — avoids two separate roundtrips
    const [companies, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          // Include only the latest subscription (most relevant)
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              // Avoid returning BigInt fields from Plan (e.g. maxLedgerEntries)
              // to keep API responses JSON-serializable.
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
          },
          _count: {
            select: { users: true },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { companies, total, page, limit };
  }

  /**
   * Find a single company by ID (full details)
   */
  async findCompanyById(companyId: string) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 3, // Last 3 subscriptions for history
          include: {
            // Keep plan payload JSON-safe (no BigInt fields).
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
        },
        _count: {
          select: {
            users: true,
            customers: true,
            suppliers: true,
            employees: true,
            ledgerEntries: true,
          },
        },
      },
    });
  }

  /**
   * Lightweight company lookup used by mutation guards.
   */
  async findCompanyByIdBasic(companyId: string) {
    return this.prisma.company.findFirst({
      where: { id: companyId, isDeleted: false },
    });
  }

  /**
   * Lookup company by id regardless of deletion state.
   * Used by lifecycle operations (restore/purge guards).
   */
  async findCompanyByIdAnyState(companyId: string) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
    });
  }

  /**
   * Update company profile fields and write audit metadata.
   */
  async updateCompany(
    companyId: string,
    data: Prisma.CompanyUpdateInput,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: companyId },
        data,
      });

      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'platform.update-company',
          entityType: 'company',
          entityId: companyId,
          metadata: {
            updatedFields: Object.keys(data),
          },
        },
      });

      return updated;
    });
  }

  /**
   * Toggle company active state (platform emergency switch).
   */
  async setCompanyActiveState(
    companyId: string,
    isActive: boolean,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: companyId },
        data: { isActive },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: isActive ? 'platform.enable-company' : 'platform.disable-company',
          entityType: 'company',
          entityId: companyId,
          metadata: {
            isActive,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Soft-archive company.
   * - Keeps data recoverable
   * - Disables workspace access
   */
  async archiveCompany(companyId: string, actorUserId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: companyId },
        data: {
          isActive: false,
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'platform.archive-company',
          entityType: 'company',
          entityId: companyId,
          metadata: {
            reason: reason ?? null,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Restore a previously archived company.
   */
  async restoreCompany(companyId: string, actorUserId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: companyId },
        data: {
          isDeleted: false,
          deletedAt: null,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'platform.restore-company',
          entityType: 'company',
          entityId: companyId,
          metadata: {
            reason: reason ?? null,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Count subscriptions that should block hard-delete.
   * Active/trial/suspended subscriptions indicate ongoing operational state.
   */
  async countBlockingSubscriptions(companyId: string) {
    return this.prisma.companySubscription.count({
      where: {
        companyId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.SUSPENDED,
          ],
        },
      },
    });
  }

  /**
   * Counts all hard-delete blockers for accounting-safe archival-first policy.
   */
  async countHardDeleteBlockers(companyId: string) {
    const [
      liveSubscriptions,
      invoices,
      ledgerEntries,
      expenses,
      deferredSales,
      installmentContracts,
      subscriptionPayments,
      auditLogs,
    ] = await this.prisma.$transaction(async (tx) => {
      const values = await Promise.all([
        tx.companySubscription.count({
          where: {
            companyId,
            status: {
              in: [
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.TRIAL,
                SubscriptionStatus.SUSPENDED,
              ],
            },
          },
        }),
        tx.invoice.count({ where: { companyId } }),
        tx.ledgerEntry.count({ where: { companyId } }),
        tx.expense.count({ where: { companyId } }),
        tx.deferredSale.count({ where: { companyId } }),
        tx.installmentContract.count({ where: { companyId } }),
        tx.subscriptionPayment.count({ where: { companyId } }),
        tx.auditLog.count({ where: { companyId } }),
      ]);

      return values;
    });

    const blockers = {
      liveSubscriptions,
      invoices,
      ledgerEntries,
      expenses,
      deferredSales,
      installmentContracts,
      subscriptionPayments,
      auditLogs,
    };

    return {
      ...blockers,
      total: Object.values(blockers).reduce((sum, value) => sum + value, 0),
    };
  }

  /**
   * Security/audit event for blocked hard-delete attempts.
   */
  async logBlockedHardDeleteAttempt(data: {
    companyId: string;
    actorUserId: string;
    reasonCode: string;
    reason?: string;
    details?: Record<string, unknown>;
  }) {
    await this.prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        actorUserId: data.actorUserId,
          action: 'platform.delete-company.blocked',
          entityType: 'company',
          entityId: data.companyId,
          metadata: {
            reasonCode: data.reasonCode,
            reason: data.reason ?? null,
            details: (data.details ?? {}) as Prisma.InputJsonValue,
          } as Prisma.InputJsonValue,
        },
      });
  }

  /**
   * Permanently remove company and all cascade-linked data.
   * Should only be called after strict guard checks in use case.
   */
  async hardDeleteCompany(companyId: string) {
    return this.prisma.company.delete({
      where: { id: companyId },
    });
  }

  /**
   * Get company usage metrics for the dashboard
   * Uses parallel count queries — all scoped to companyId
   */
  async getCompanyMetrics(companyId: string) {
    const [usersCount, customersCount, suppliersCount, employeesCount, ledgerEntriesCount, subscription] =
      await this.prisma.$transaction(async (tx) => {
        const [
          users,
          customers,
          suppliers,
          employees,
          ledgerEntries,
          currentSubscription,
        ] = await Promise.all([
          tx.user.count({ where: { companyId, isDeleted: false } }),
          tx.customer.count({ where: { companyId, isDeleted: false } }),
          tx.supplier.count({ where: { companyId, isDeleted: false } }),
          tx.employee.count({ where: { companyId, isDeleted: false } }),
          tx.ledgerEntry.count({ where: { companyId, isDeleted: false } }),
          this.subscriptionGovernance.findSubscriptionForAccess(companyId, tx),
        ]);

        return [
          users,
          customers,
          suppliers,
          employees,
          ledgerEntries,
          currentSubscription,
        ] as const;
      });

    return {
      usersCount,
      customersCount,
      suppliersCount,
      employeesCount,
      ledgerEntriesCount,
      subscription,
    };
  }

  // ══════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ══════════════════════════════════════════════

  /**
   * Find the latest (most relevant) subscription for a company
   */
  async findLatestSubscription(companyId: string) {
    return this.subscriptionGovernance.findLatestSubscriptionWithPlan(companyId);
  }

  /**
   * Find active/trial subscription for a company
   */
  async findActiveSubscription(companyId: string) {
    return this.subscriptionGovernance.findEntitledSubscriptionWithPlan(companyId);
  }

  /**
   * Activate/upgrade a company's subscription
   * Creates a new subscription record (preserves history)
   */
  async activateSubscription(data: {
    companyId: string;
    planId: string;
    endDate: Date;
    autoRenew: boolean;
    actorUserId: string;
    note?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize lifecycle changes for this company to avoid double-activation races.
      await this.subscriptionGovernance.lockCompanyForSubscriptionMutation(
        data.companyId,
        tx,
      );

      // Expire any existing live subscription before activating the new plan.
      await tx.companySubscription.updateMany({
        where: {
          companyId: data.companyId,
          status: {
            in: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIAL,
              SubscriptionStatus.SUSPENDED,
            ],
          },
        },
        data: { status: SubscriptionStatus.EXPIRED },
      });

      // Create new active subscription
      const subscription = await tx.companySubscription.create({
        data: {
          companyId: data.companyId,
          planId: data.planId,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(),
          endDate: data.endDate,
          autoRenew: data.autoRenew ?? false,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      // Update company's isActive flag (re-enable if it was suspended)
      await tx.company.update({
        where: { id: data.companyId },
        data: { isActive: true },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          companyId: data.companyId,
          actorUserId: data.actorUserId,
          action: 'platform.activate-subscription',
          entityType: 'subscription',
          entityId: subscription.id,
          metadata: {
            planId: data.planId,
            endDate: data.endDate.toISOString(),
            autoRenew: data.autoRenew,
            note: data.note,
          },
        },
      });

      return subscription;
    });
  }

  /**
   * Suspend a company's active subscription
   * Sets status to SUSPENDED — company enters read-only mode
   */
  async suspendSubscription(data: {
    companyId: string;
    actorUserId: string;
    reason?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.subscriptionGovernance.lockCompanyForSubscriptionMutation(
        data.companyId,
        tx,
      );

      // Find existing active subscription
      const subscription =
        await this.subscriptionGovernance.findEntitledSubscriptionWithPlan(
          data.companyId,
          tx,
        );

      if (!subscription) return null;

      // Update subscription status
      const updated = await tx.companySubscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.SUSPENDED },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          companyId: data.companyId,
          actorUserId: data.actorUserId,
          action: 'platform.suspend-subscription',
          entityType: 'subscription',
          entityId: subscription.id,
          metadata: {
            reason: data.reason,
            previousStatus: subscription.status,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Extend a company's subscription end date
   * Works on ACTIVE, TRIAL, and SUSPENDED subscriptions
   */
  async extendSubscription(data: {
    companyId: string;
    newEndDate: Date;
    actorUserId: string;
    reason?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.subscriptionGovernance.lockCompanyForSubscriptionMutation(
        data.companyId,
        tx,
      );

      // Get current subscription (any status except DISABLED)
      const subscription =
        await this.subscriptionGovernance.findSubscriptionForExtension(
          data.companyId,
          tx,
        );

      if (!subscription) return null;

      const previousEndDate = subscription.endDate;

      // Update the end date and restore ACTIVE status if it was SUSPENDED/EXPIRED
      const updated = await tx.companySubscription.update({
        where: { id: subscription.id },
        data: {
          endDate: data.newEndDate,
          status:
            subscription.status === SubscriptionStatus.ACTIVE ||
            subscription.status === SubscriptionStatus.TRIAL
              ? subscription.status
              : SubscriptionStatus.ACTIVE,
        },
      });

      // Re-activate company if needed
      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        await tx.company.update({
          where: { id: data.companyId },
          data: { isActive: true },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          companyId: data.companyId,
          actorUserId: data.actorUserId,
          action: 'platform.extend-subscription',
          entityType: 'subscription',
          entityId: subscription.id,
          metadata: {
            previousEndDate: previousEndDate.toISOString(),
            newEndDate: data.newEndDate.toISOString(),
            reason: data.reason,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Change plan immediately:
   * 1) expire current live subscription
   * 2) create new active subscription with same endDate window
   */
  async changePlanImmediate(data: {
    companyId: string;
    newPlanId: string;
    actorUserId: string;
    reason?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.subscriptionGovernance.lockCompanyForSubscriptionMutation(
        data.companyId,
        tx,
      );

      const current =
        await this.subscriptionGovernance.findEntitledSubscriptionWithPlan(
          data.companyId,
          tx,
        );

      if (!current) return null;

      const now = new Date();

      await tx.companySubscription.update({
        where: { id: current.id },
        data: {
          status: SubscriptionStatus.EXPIRED,
          endDate: now < current.endDate ? now : current.endDate,
        },
      });

      const changed = await tx.companySubscription.create({
        data: {
          companyId: data.companyId,
          planId: data.newPlanId,
          status: SubscriptionStatus.ACTIVE,
          startDate: now,
          endDate: current.endDate,
          autoRenew: current.autoRenew,
          paymentStatus: current.paymentStatus,
        },
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

      await tx.auditLog.create({
        data: {
          companyId: data.companyId,
          actorUserId: data.actorUserId,
          action: 'platform.change-plan.immediate',
          entityType: 'subscription',
          entityId: changed.id,
          metadata: {
            previousSubscriptionId: current.id,
            previousPlanId: current.planId,
            newPlanId: data.newPlanId,
            previousEndDate: current.endDate.toISOString(),
            reason: data.reason ?? null,
          },
        },
      });

      return changed;
    });
  }

  // ══════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════

  /**
   * Check if an email is already registered (for owner creation)
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase().trim() },
    });
    return count > 0;
  }
}

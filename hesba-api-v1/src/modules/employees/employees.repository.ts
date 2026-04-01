// ============================================
// Employees Repository — Database Layer
// ============================================
// Pure data access — no business logic.
// All queries are company-scoped (multi-tenant isolation).
//
// Polymorphic Balance:
//   Balance uses (companyId, partyType, partyId) composite PK.
//   No direct Prisma relation to Employee — fetched in parallel.
//
// AuditLog actions:
//   'employees.create'  — إنشاء موظف
//   'employees.update'  — تعديل بيانات
//   'employees.delete'  — حذف ناعم
//
// Optimistic locking:
//   update() uses updateMany with version in WHERE clause.
//   Returns count of updated rows — 0 means race condition.
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SubscriptionGovernanceService } from '../../database/services/subscription-governance.service';
import { PartyType, Prisma } from '@prisma/client';

@Injectable()
export class EmployeesRepository {
  private readonly logger = new Logger(EmployeesRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGovernance: SubscriptionGovernanceService,
  ) {}

  // ══════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════

  /**
   * إنشاء موظف جديد مع تهيئة الرصيد — عملية atomic
   *
   * Design: Employee + Balance + AuditLog in single transaction.
   * Balance is initialized to openingBalance immediately.
   * If any step fails, the whole transaction is rolled back.
   */
  async createWithBalance(data: {
    companyId: string;
    name: string;
    phone?: string;
    jobTitle?: string;
    openingBalance: number;
    actorUserId: string;
  }, tx?: Prisma.TransactionClient) {
    const write = async (db: Prisma.TransactionClient) => {
      // 1. إنشاء الموظف
      const employee = await db.employee.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          phone: data.phone ?? null,
          jobTitle: data.jobTitle ?? null,
          openingBalance: data.openingBalance,
        },
      });

      // 2. تهيئة رصيد الموظف بالرصيد الافتتاحي
      await db.balance.create({
        data: {
          companyId: data.companyId,
          partyType: PartyType.EMPLOYEE,
          partyId: employee.id,
          balance: data.openingBalance,
        },
      });

      // 3. تسجيل في Audit Log
      await db.auditLog.create({
        data: {
          companyId: data.companyId,
          actorUserId: data.actorUserId,
          action: 'employees.create',
          entityType: 'employee',
          entityId: employee.id,
          metadata: {
            name: employee.name,
            openingBalance: data.openingBalance,
          },
        },
      });

      this.logger.log(
        `Employee created: ${employee.id} by ${data.actorUserId}`,
      );
      return employee;
    };

    if (tx) return write(tx);
    return this.prisma.$transaction((innerTx) => write(innerTx));
  }

  // ══════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════

  /**
   * جلب موظف واحد بالـ ID مع رصيده الحالي (company-scoped)
   */
  async findById(companyId: string, employeeId: string) {
    const [employee, balance] = await this.prisma.$transaction([
      this.prisma.employee.findFirst({
        where: { id: employeeId, companyId, isDeleted: false },
      }),
      this.prisma.balance.findUnique({
        where: {
          companyId_partyType_partyId: {
            companyId,
            partyType: PartyType.EMPLOYEE,
            partyId: employeeId,
          },
        },
        select: { balance: true },
      }),
    ]);

    if (!employee) return null;

    return {
      ...employee,
      balance: balance?.balance ?? 0,
    };
  }

  /**
   * جلب قائمة الموظفين مع pagination + search + filters
   *
   * Performance:
   *   - count + data fetched in parallel via $transaction
   *   - balances fetched in one batch query then merged (no N+1)
   *   - Indexes on (companyId, isDeleted, isActive) and (companyId, name)
   */
  async findMany(
    companyId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      isActive?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const {
      page,
      limit,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;
    const normalizedSortBy = sortBy === 'fullName' ? 'name' : sortBy;
    const allowedSortBy = new Set([
      'name',
      'phone',
      'jobTitle',
      'openingBalance',
      'isActive',
      'createdAt',
      'updatedAt',
    ]);
    const safeSortBy = allowedSortBy.has(normalizedSortBy)
      ? normalizedSortBy
      : 'createdAt';

    // Build dynamic where clause
    const where: Prisma.EmployeeWhereInput = {
      companyId,
      isDeleted: false,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { jobTitle: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Fetch count + employees in parallel for performance
    const [employees, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [safeSortBy]: sortOrder },
      }),
      this.prisma.employee.count({ where }),
    ]);

    if (employees.length === 0) {
      return { data: [], total, page, limit };
    }

    // Fetch all balances in one batch (avoids N+1)
    const balances = await this.prisma.balance.findMany({
      where: {
        companyId,
        partyType: PartyType.EMPLOYEE,
        partyId: { in: employees.map((e) => e.id) },
      },
      select: { partyId: true, balance: true },
    });

    // Build lookup map for O(1) merge
    const balanceMap = new Map(balances.map((b) => [b.partyId, b.balance]));

    const data = employees.map((employee) => ({
      ...employee,
      balance: balanceMap.get(employee.id) ?? 0,
    }));

    return { data, total, page, limit };
  }

  // ══════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════

  /**
   * تعديل بيانات موظف مع Optimistic Locking
   *
   * Returns the number of rows updated:
   *   0 → version mismatch (race condition) → throw 409 in use case
   *   1 → success
   *
   * Increments version atomically to signal change to other clients.
   */
  async update(
    companyId: string,
    employeeId: string,
    version: number,
    data: {
      name?: string;
      phone?: string | null;
      jobTitle?: string | null;
      isActive?: boolean;
    },
    actorUserId: string,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      // Snapshot current state for audit before update
      const before = await tx.employee.findFirst({
        where: { id: employeeId, companyId, isDeleted: false },
      });

      const result = await tx.employee.updateMany({
        where: {
          id: employeeId,
          companyId,
          version, // ← Optimistic locking: update only if version matches
          isDeleted: false,
        },
        data: {
          ...data,
          version: { increment: 1 }, // ← Bump version after successful update
        },
      });

      // Only write audit log if update actually happened
      if (result.count > 0 && before) {
        await tx.auditLog.create({
          data: {
            companyId,
            actorUserId,
            action: 'employees.update',
            entityType: 'employee',
            entityId: employeeId,
            metadata: { before: { version, ...data }, changes: data },
          },
        });
      }

      return result.count;
    });
  }

  // ══════════════════════════════════════════════
  // SOFT DELETE
  // ══════════════════════════════════════════════

  /**
   * حذف ناعم — يحتفظ بالبيانات للتدقيق
   *
   * Note: Call hasLedgerEntries() before calling this — enforced in use case.
   */
  async softDelete(companyId: string, employeeId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.employee.updateMany({
        where: { id: employeeId, companyId, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      if (result.count > 0) {
        await tx.auditLog.create({
          data: {
            companyId,
            actorUserId,
            action: 'employees.delete',
            entityType: 'employee',
            entityId: employeeId,
            metadata: { deletedBy: actorUserId },
          },
        });
      }

      return result.count;
    });
  }

  // ══════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════

  /**
   * هل يوجد موظف بنفس الاسم في الشركة؟ (لمنع التكرار)
   * excludeId: استثناء الموظف الحالي عند التعديل
   */
  async existsByName(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: {
        companyId,
        name: { equals: name, mode: 'insensitive' },
        isDeleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }

  /**
   * هل للموظف حركات في دفتر الأستاذ؟
   * يُستخدم لمنع حذف موظف لديه حركات مالية.
   */
  async hasLedgerEntries(
    companyId: string,
    employeeId: string,
  ): Promise<boolean> {
    const count = await this.prisma.ledgerEntry.count({
      where: {
        companyId,
        partyType: PartyType.EMPLOYEE,
        partyId: employeeId,
        isDeleted: false,
      },
    });
    return count > 0;
  }

  /**
   * جلب الحد الأقصى لعدد الموظفين من خطة الشركة
   * Returns null if no limit (unlimited plan)
   */
  async getEmployeeLimit(companyId: string): Promise<number | null> {
    const subscription =
      await this.subscriptionGovernance.findEntitledSubscriptionPlanLimits(
        companyId,
      );
    return subscription?.plan?.maxEmployees ?? null;
  }

  /**
   * عدد الموظفين النشطة (غير المحذوفة) في الشركة
   */
  async countEmployees(companyId: string): Promise<number> {
    return this.prisma.employee.count({
      where: { companyId, isDeleted: false },
    });
  }
}

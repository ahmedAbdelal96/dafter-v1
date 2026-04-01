// ============================================
// Suppliers Repository — Database Layer
// ============================================
// Pure data access — no business logic.
// All queries are company-scoped (multi-tenant isolation).
//
// Polymorphic Balance:
//   Balance uses (companyId, partyType, partyId) composite PK.
//   No direct Prisma relation to Supplier — fetched in parallel.
//
// AuditLog actions:
//   'suppliers.create'  — إنشاء مورد
//   'suppliers.update'  — تعديل بيانات
//   'suppliers.delete'  — حذف ناعم
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
export class SuppliersRepository {
  private readonly logger = new Logger(SuppliersRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGovernance: SubscriptionGovernanceService,
  ) {}

  // ══════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════

  /**
   * إنشاء مورد جديد مع تهيئة الرصيد — عملية atomic
   *
   * Design: Supplier + Balance + AuditLog in single transaction.
   * Balance is initialized to openingBalance immediately.
   * If any step fails, the whole transaction is rolled back.
   */
  async createWithBalance(data: {
    companyId: string;
    name: string;
    phone?: string;
    address?: string;
    openingBalance: number;
    actorUserId: string;
  }, tx?: Prisma.TransactionClient) {
    const write = async (db: Prisma.TransactionClient) => {
      // 1. إنشاء المورد
      const supplier = await db.supplier.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          phone: data.phone ?? null,
          address: data.address ?? null,
          openingBalance: data.openingBalance,
        },
      });

      // 2. تهيئة رصيد المورد بالرصيد الافتتاحي
      await db.balance.create({
        data: {
          companyId: data.companyId,
          partyType: PartyType.SUPPLIER,
          partyId: supplier.id,
          balance: data.openingBalance,
        },
      });

      // 3. تسجيل في Audit Log
      await db.auditLog.create({
        data: {
          companyId: data.companyId,
          actorUserId: data.actorUserId,
          action: 'suppliers.create',
          entityType: 'supplier',
          entityId: supplier.id,
          metadata: {
            name: supplier.name,
            openingBalance: data.openingBalance,
          },
        },
      });

      return supplier;
    };

    if (tx) return write(tx);
    return this.prisma.$transaction((innerTx) => write(innerTx));
  }

  // ══════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════

  /**
   * جلب مورد واحد بالـ ID مع رصيده الحالي (company-scoped)
   */
  async findById(companyId: string, supplierId: string) {
    const [supplier, balance] = await this.prisma.$transaction([
      this.prisma.supplier.findFirst({
        where: { id: supplierId, companyId, isDeleted: false },
      }),
      this.prisma.balance.findUnique({
        where: {
          companyId_partyType_partyId: {
            companyId,
            partyType: PartyType.SUPPLIER,
            partyId: supplierId,
          },
        },
        select: { balance: true },
      }),
    ]);

    if (!supplier) return null;

    return {
      ...supplier,
      balance: balance?.balance ?? 0,
    };
  }

  /**
   * جلب قائمة الموردين مع pagination + search + filters
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

    // Build dynamic where clause
    const where: Prisma.SupplierWhereInput = {
      companyId,
      isDeleted: false,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
    };

    // Fetch count + suppliers in parallel for performance
    const [suppliers, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    if (suppliers.length === 0) {
      return { data: [], total, page, limit };
    }

    // Fetch all balances in one batch (avoids N+1)
    const balances = await this.prisma.balance.findMany({
      where: {
        companyId,
        partyType: PartyType.SUPPLIER,
        partyId: { in: suppliers.map((s) => s.id) },
      },
      select: { partyId: true, balance: true },
    });

    // Build lookup map for O(1) merge
    const balanceMap = new Map(balances.map((b) => [b.partyId, b.balance]));

    const data = suppliers.map((supplier) => ({
      ...supplier,
      balance: balanceMap.get(supplier.id) ?? 0,
    }));

    return { data, total, page, limit };
  }

  // ══════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════

  /**
   * تعديل بيانات مورد مع Optimistic Locking
   *
   * Returns the number of rows updated:
   *   0 → version mismatch (race condition) → throw 409 in use case
   *   1 → success
   *
   * Increments version atomically to signal change to other clients.
   */
  async update(
    companyId: string,
    supplierId: string,
    version: number,
    data: {
      name?: string;
      phone?: string | null;
      address?: string | null;
      isActive?: boolean;
    },
    actorUserId: string,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      // Snapshot current state for audit before update
      const before = await tx.supplier.findFirst({
        where: { id: supplierId, companyId, isDeleted: false },
      });

      const result = await tx.supplier.updateMany({
        where: {
          id: supplierId,
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
            action: 'suppliers.update',
            entityType: 'supplier',
            entityId: supplierId,
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
  async softDelete(companyId: string, supplierId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.supplier.updateMany({
        where: { id: supplierId, companyId, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      if (result.count > 0) {
        await tx.auditLog.create({
          data: {
            companyId,
            actorUserId,
            action: 'suppliers.delete',
            entityType: 'supplier',
            entityId: supplierId,
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
   * هل يوجد مورد بنفس الاسم في الشركة؟ (لمنع التكرار)
   * excludeId: استثناء المورد الحالي عند التعديل
   */
  async existsByName(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.supplier.count({
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
   * هل للمورد حركات في دفتر الأستاذ؟
   * يُستخدم لمنع حذف مورد لديه حركات مالية.
   */
  async hasLedgerEntries(
    companyId: string,
    supplierId: string,
  ): Promise<boolean> {
    const count = await this.prisma.ledgerEntry.count({
      where: {
        companyId,
        partyType: PartyType.SUPPLIER,
        partyId: supplierId,
        isDeleted: false,
      },
    });
    return count > 0;
  }

  /**
   * جلب الحد الأقصى لعدد الموردين من خطة الشركة
   * Returns null if no limit (unlimited plan)
   */
  async getSupplierLimit(companyId: string): Promise<number | null> {
    const subscription =
      await this.subscriptionGovernance.findEntitledSubscriptionPlanLimits(
        companyId,
      );
    return subscription?.plan?.maxSuppliers ?? null;
  }

  /**
   * عدد الموردين النشطة (غير المحذوفة) في الشركة
   */
  async countSuppliers(companyId: string): Promise<number> {
    return this.prisma.supplier.count({
      where: { companyId, isDeleted: false },
    });
  }
}

// ============================================
// Customers Repository — Database Layer
// ============================================
// Pure data access — no business logic.
// All queries are company-scoped (multi-tenant isolation).
//
// Polymorphic Balance:
//   Balance uses (companyId, partyType, partyId) composite PK.
//   No direct Prisma relation to Customer — fetched in parallel.
//
// AuditLog actions:
//   'customers.create'  — إنشاء عميل
//   'customers.update'  — تعديل بيانات
//   'customers.delete'  — حذف ناعم
//
// Optimistic locking:
//   update() uses updateMany with version in WHERE clause.
//   Returns count of updated rows — 0 means race condition.
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SubscriptionGovernanceService } from '../../database/services/subscription-governance.service';
import { InvoiceStatus, PartyType, Prisma } from '@prisma/client';

@Injectable()
export class CustomersRepository {
  private readonly logger = new Logger(CustomersRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGovernance: SubscriptionGovernanceService,
  ) {}

  // ══════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════

  /**
   * إنشاء عميل جديد مع تهيئة الرصيد — عملية atomic
   *
   * Design: Customer + Balance + AuditLog in single transaction.
   * Balance is initialized to openingBalance immediately.
   * If any step fails, the whole transaction is rolled back.
   */
  async createWithBalance(data: {
    companyId: string;
    name: string;
    phone?: string;
    address?: string;
    openingBalance: number;
    creditLimit?: number;
    actorUserId: string;
  }, tx?: Prisma.TransactionClient) {
    const write = async (db: Prisma.TransactionClient) => {
      // 1. إنشاء العميل
      const customer = await db.customer.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          phone: data.phone ?? null,
          address: data.address ?? null,
          openingBalance: data.openingBalance,
          creditLimit: data.creditLimit ?? null,
        },
      });

      // 2. تهيئة رصيد العميل بالرصيد الافتتاحي
      await db.balance.create({
        data: {
          companyId: data.companyId,
          partyType: PartyType.CUSTOMER,
          partyId: customer.id,
          balance: data.openingBalance,
        },
      });

      // 3. تسجيل في Audit Log
      await db.auditLog.create({
        data: {
          companyId: data.companyId,
          actorUserId: data.actorUserId,
          action: 'customers.create',
          entityType: 'customer',
          entityId: customer.id,
          metadata: {
            name: customer.name,
            openingBalance: data.openingBalance,
          },
        },
      });

      return customer;
    };

    if (tx) return write(tx);
    return this.prisma.$transaction((innerTx) => write(innerTx));
  }

  // ══════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════

  /**
   * جلب عميل واحد بالـ ID مع رصيده الحالي (company-scoped)
   */
  async findById(companyId: string, customerId: string) {
    const [customer, balance] = await this.prisma.$transaction([
      this.prisma.customer.findFirst({
        where: { id: customerId, companyId, isDeleted: false },
      }),
      this.prisma.balance.findUnique({
        where: {
          companyId_partyType_partyId: {
            companyId,
            partyType: PartyType.CUSTOMER,
            partyId: customerId,
          },
        },
        select: { balance: true },
      }),
    ]);

    if (!customer) return null;

    return {
      ...customer,
      balance: balance?.balance ?? 0,
    };
  }

  /**
   * جلب قائمة العملاء مع pagination + search + filters
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
    const where: Prisma.CustomerWhereInput = {
      companyId,
      isDeleted: false,
      // isActive filter: only apply when explicitly requested
      ...(isActive !== undefined && { isActive }),
      // Search by name or phone (case-insensitive)
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
    };

    // Fetch count + customers in parallel for performance
    const [customers, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.customer.count({ where }),
    ]);

    if (customers.length === 0) {
      return { data: [], total, page, limit };
    }

    // Fetch all balances in one batch (avoids N+1)
    const balances = await this.prisma.balance.findMany({
      where: {
        companyId,
        partyType: PartyType.CUSTOMER,
        partyId: { in: customers.map((c) => c.id) },
      },
      select: { partyId: true, balance: true },
    });

    // Build lookup map for O(1) merge
    const balanceMap = new Map(balances.map((b) => [b.partyId, b.balance]));

    const data = customers.map((customer) => ({
      ...customer,
      balance: balanceMap.get(customer.id) ?? 0,
    }));

    return { data, total, page, limit };
  }

  // ══════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════

  /**
   * تعديل بيانات عميل مع Optimistic Locking
   *
   * Returns the number of rows updated:
   *   0 → version mismatch (race condition) → throw 409 in use case
   *   1 → success
   *
   * Increments version atomically to signal change to other clients.
   */
  async update(
    companyId: string,
    customerId: string,
    version: number,
    data: {
      name?: string;
      phone?: string | null;
      address?: string | null;
      creditLimit?: number | null;
      isActive?: boolean;
    },
    actorUserId: string,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      // Snapshot current state for audit before update
      const before = await tx.customer.findFirst({
        where: { id: customerId, companyId, isDeleted: false },
      });

      const result = await tx.customer.updateMany({
        where: {
          id: customerId,
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
            action: 'customers.update',
            entityType: 'customer',
            entityId: customerId,
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
  async softDelete(companyId: string, customerId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.customer.updateMany({
        where: { id: customerId, companyId, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      if (result.count > 0) {
        await tx.auditLog.create({
          data: {
            companyId,
            actorUserId,
            action: 'customers.delete',
            entityType: 'customer',
            entityId: customerId,
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
   * هل يوجد عميل بنفس الاسم في الشركة؟ (لمنع التكرار)
   * excludeId: استثناء العميل الحالي عند التعديل
   */
  async existsByName(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.customer.count({
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
   * هل للعميل حركات في دفتر الأستاذ؟
   * يُستخدم لمنع حذف عميل لديه حركات مالية.
   */
  async hasLedgerEntries(
    companyId: string,
    customerId: string,
  ): Promise<boolean> {
    const count = await this.prisma.ledgerEntry.count({
      where: {
        companyId,
        partyType: PartyType.CUSTOMER,
        partyId: customerId,
        isDeleted: false,
      },
    });
    return count > 0;
  }

  /**
   * جلب الحد الأقصى لعدد العملاء من خطة الشركة
   * Returns null if no limit (unlimited plan)
   */
  async getCustomerLimit(companyId: string): Promise<number | null> {
    const subscription =
      await this.subscriptionGovernance.findEntitledSubscriptionPlanLimits(
        companyId,
      );
    return subscription?.plan?.maxCustomers ?? null;
  }

  /**
   * عدد العملاء النشطة (غير المحذوفة) في الشركة
   */
  async countCustomers(companyId: string): Promise<number> {
    return this.prisma.customer.count({
      where: { companyId, isDeleted: false },
    });
  }

  // ── SNAPSHOT ──────────────────────────────────────────────────────────────

  /**
   * ملخص العميل أثناء البيع — يُرجع:
   *   currentBalance    : الرصيد الحالي من جدول Balance
   *   creditLimit       : حد الائتمان (null = غير محدد)
   *   overdueAmount     : مجموع المبالغ المتأخرة (DeferredSale بحالة OVERDUE)
   *   lastInvoiceDate   : تاريخ آخر فاتورة معتمدة
   *   lastPaymentDate   : تاريخ آخر دفعة مسجلة
   *   openInvoicesCount : عدد الفواتير المعتمدة غير الملغاة
   *   totalPurchases    : إجمالي المشتريات (فواتير معتمدة فقط)
   *
   * All queries run in parallel via $transaction([...]) — single DB round-trip.
   * Returns null if the customer does not exist.
   */
  async getSnapshot(companyId: string, customerId: string) {
    // Verify customer exists first (cheap check)
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId, isDeleted: false },
      select: { id: true, creditLimit: true },
    });
    if (!customer) return null;

    const [
      balance,
      lastInvoice,
      lastPayment,
      openInvoicesAgg,
      overdueAgg,
    ] = await this.prisma.$transaction([
      // 1. Current balance
      this.prisma.balance.findUnique({
        where: {
          companyId_partyType_partyId: {
            companyId,
            partyType: PartyType.CUSTOMER,
            partyId: customerId,
          },
        },
        select: { balance: true },
      }),

      // 2. Most recent APPROVED invoice
      this.prisma.invoice.findFirst({
        where: {
          companyId,
          partyType: PartyType.CUSTOMER,
          partyId: customerId,
          status: 'APPROVED',
          isDeleted: false,
        },
        orderBy: { issueDate: 'desc' },
        select: { issueDate: true },
      }),

      // 3. Most recent PAYMENT ledger entry
      this.prisma.ledgerEntry.findFirst({
        where: {
          companyId,
          partyType: PartyType.CUSTOMER,
          partyId: customerId,
          entryType: 'PAYMENT',
          isDeleted: false,
        },
        orderBy: { entryDate: 'desc' },
        select: { entryDate: true },
      }),

      // 4. Open invoices count + totalPurchases (APPROVED only)
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          partyType: PartyType.CUSTOMER,
          partyId: customerId,
          status: 'APPROVED',
          isDeleted: false,
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),

      // 5. Overdue deferred sales (remaining = totalAmount - paidAmount)
      this.prisma.deferredSale.aggregate({
        where: {
          companyId,
          partyType: PartyType.CUSTOMER,
          partyId: customerId,
          status: 'OVERDUE',
          isDeleted: false,
        },
        _sum: { totalAmount: true, paidAmount: true },
      }),
    ]);

    const currentBalance = parseFloat(
      (balance?.balance ?? new Prisma.Decimal(0)).toString(),
    );
    const totalPurchases = parseFloat(
      (openInvoicesAgg._sum.totalAmount ?? new Prisma.Decimal(0)).toString(),
    );
    const overdueTotal = parseFloat(
      (overdueAgg._sum.totalAmount ?? new Prisma.Decimal(0)).toString(),
    );
    const overduePaid = parseFloat(
      (overdueAgg._sum.paidAmount ?? new Prisma.Decimal(0)).toString(),
    );

    return {
      currentBalance,
      creditLimit: customer.creditLimit
        ? parseFloat(customer.creditLimit.toString())
        : null,
      overdueAmount: Math.max(0, overdueTotal - overduePaid),
      lastInvoiceDate: lastInvoice?.issueDate ?? null,
      lastPaymentDate: lastPayment?.entryDate ?? null,
      openInvoicesCount: openInvoicesAgg._count.id,
      totalPurchases,
      hasOverdue: overdueTotal > overduePaid,
    };
  }

  // ── FREQUENT PRODUCTS ─────────────────────────────────────────────────

  /**
   * Top products bought by this customer (from APPROVED invoices),
   * ranked by how often each product appears as a line-item.
   * Returns null if the customer does not exist.
   */
  async getFrequentProducts(
    companyId: string,
    customerId: string,
    limit: number,
  ) {
    // Verify customer exists (fast check)
    const exists = await this.prisma.customer.count({
      where: { id: customerId, companyId, isDeleted: false },
    });
    if (!exists) return null;

    // Group invoice items by product for this customer's APPROVED invoices
    const groups = await this.prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        invoice: {
          companyId,
          isDeleted: false,
          status: InvoiceStatus.APPROVED,
          partyType: PartyType.CUSTOMER,
          partyId: customerId,
        },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    const productIds = groups
      .map((g) => g.productId)
      .filter((id): id is string => id !== null);

    if (productIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isDeleted: false },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        unitPrice: true,
        isActive: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return groups
      .map((g) => {
        const product = productMap.get(g.productId!);
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          unitPrice: product.unitPrice,
          isActive: product.isActive,
          useCount: g._count.productId,
        };
      })
      .filter(Boolean);
  }
}

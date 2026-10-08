// ============================================================
// Deferred Sales Repository — Financial Data Access Layer
// ============================================================
//
// ⚠️  FINANCIAL PRECISION — CRITICAL DESIGN DECISIONS:
//
//   1. NEVER perform balance arithmetic in JavaScript/TypeScript.
//      JavaScript numbers (IEEE 754 float64) lose precision for
//      large or high-precision decimals (e.g., 0.1 + 0.2 ≠ 0.3).
//
//   2. Balance/paidAmount updates use Prisma's DB-level `increment`/`decrement`:
//        data: { balance: { increment: amount } }
//      This lets PostgreSQL's DECIMAL(14,2) engine handle arithmetic,
//      which is mathematically exact for fixed-point numbers.
//
//   3. All write operations are wrapped in prisma.$transaction() to ensure
//      atomicity. LedgerEntry + DeferredSale + Balance stay in sync.
//
//   4. companyId is present in EVERY query for multi-tenant isolation.
//
//   5. isDeleted: false is included in every read query.
//
// Architecture:
//   - DeferredSale: financial record with status tracking
//   - DeferredPayment: immutable payment records (no soft delete)
//   - LedgerEntry: linked to both (INVOICE for sale, PAYMENT for each payment)
//   - Balance: running snapshot — always use increment/decrement
//   - AuditLog: inside every write transaction
//
// Party lookup:
//   We verify party existence directly using PrismaService rather than
//   importing party modules. Reason: avoids circular dependencies.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  PartyType,
  DeferredSaleStatus,
  LedgerEntryType,
  SaleType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

// ── Types ───────────────────────────────────────────────────────────────────

/** Data needed to create a DeferredSale inside a transaction */
export interface CreateDeferredSaleData {
  companyId: string;
  partyType: PartyType;
  partyId: string;
  referenceNumber: string;
  totalAmount: number;
  dueDate: Date;
  description?: string | null;
  createdById: string;
  ledgerEntryId: string;
}

/** Parameters for the paginated list query */
export interface FindManyDeferredSalesParams {
  partyType?: PartyType;
  partyId?: string;
  status?: DeferredSaleStatus;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  search?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Data to update status and paidAmount after a payment */
export interface UpdateDeferredSaleStatusData {
  status: DeferredSaleStatus;
  paymentAmount: number;
}

/** Paginated result for list endpoint */
export interface PaginatedDeferredSales<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Repository ──────────────────────────────────────────────────────────────

@Injectable()
export class DeferredSalesRepository {
  private readonly logger = new Logger(DeferredSalesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════
  // REFERENCE NUMBER GENERATION
  // ══════════════════════════════════════════════════════════════

  /**
   * توليد رقم مرجعي فريد للبيع الآجل بصيغة DEF-{YEAR}-{NNNN}
   *
   * يعتمد على عدد البيوع الآجلة غير المحذوفة للشركة في السنة الحالية + 1.
   * مُبطَّن بأصفار حتى 4 خانات.
   *
   * @param companyId - معرف الشركة
   * @param year - السنة الميلادية (YYYY)
   * @returns رقم مرجعي بصيغة DEF-{YEAR}-{NNNN}
   */
  async generateReferenceNumber(
    companyId: string,
    year: number,
  ): Promise<string> {
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const count = await this.prisma.deferredSale.count({
      where: {
        companyId,
        isDeleted: false,
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    const ref = `DEF-${year}-${sequence}`;

    this.logger.debug(
      `Generated reference number: ${ref} for company: ${companyId}`,
    );
    return ref;
  }

  // ══════════════════════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════════════════════

  /**
   * إنشاء سجل DeferredSale داخل transaction موجود
   *
   * @param tx - Prisma transaction client
   * @param data - بيانات البيع الآجل
   * @returns السجل المنشأ
   */
  async create(
    tx: Prisma.TransactionClient,
    data: CreateDeferredSaleData,
  ) {
    return tx.deferredSale.create({
      data: {
        companyId: data.companyId,
        partyType: data.partyType,
        partyId: data.partyId,
        referenceNumber: data.referenceNumber,
        totalAmount: data.totalAmount,
        paidAmount: 0,
        dueDate: data.dueDate,
        description: data.description ?? null,
        status: DeferredSaleStatus.PENDING,
        createdById: data.createdById,
        ledgerEntryId: data.ledgerEntryId,
        version: 0,
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // READ — FIND BY ID
  // ══════════════════════════════════════════════════════════════

  /**
   * جلب بيع آجل بمعرفه مع التحقق من الشركة وحالة الحذف
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param id - معرف البيع الآجل (UUID)
   * @param includePayments - تضمين الدفعات المرتبطة (افتراضي: false)
   * @returns البيع الآجل مع اسم الطرف أو null
   */
  async findById(
    companyId: string,
    id: string,
    includePayments = false,
  ) {
    return this.prisma.deferredSale.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        payments: includePayments,
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // READ — LIST (PAGINATED)
  // ══════════════════════════════════════════════════════════════

  /**
   * جلب قائمة البيوع الآجلة مع التصفية والصفحات
   *
   * يدعم التصفية بـ: partyType, partyId, status, dateFrom, dateTo, search.
   * البحث النصي يشمل: referenceNumber, description.
   *
   * @param companyId - معرف الشركة
   * @param params - معاملات التصفية والصفحات
   * @returns قائمة مُصفَّحة مع العدد الكلي
   */
  async findMany(
    companyId: string,
    params: FindManyDeferredSalesParams,
  ): Promise<PaginatedDeferredSales<any>> {
    const {
      partyType,
      partyId,
      status,
      dateFrom,
      dateTo,
      search,
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    // Build WHERE clause — always include companyId and isDeleted: false
    const where: Prisma.DeferredSaleWhereInput = {
      companyId,
      isDeleted: false,
      ...(partyType && { partyType }),
      ...(partyId && { partyId }),
      ...(status && { status }),
      ...(dateFrom || dateTo
        ? {
            dueDate: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                referenceNumber: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                description: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };

    // Validate sortBy to prevent injection
    const allowedSortFields = [
      'createdAt',
      'dueDate',
      'totalAmount',
      'paidAmount',
      'referenceNumber',
      'status',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy: Prisma.DeferredSaleOrderByWithRelationInput = {
      [safeSortBy]: sortOrder,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.deferredSale.count({ where }),
      this.prisma.deferredSale.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          payments: false,
        },
      }),
    ]);

    return { items, total, page, limit };
  }

  // ══════════════════════════════════════════════════════════════
  // UPDATE — STATUS AND PAID AMOUNT
  // ══════════════════════════════════════════════════════════════

  /**
   * تحديث paidAmount وstatus وversion للبيع الآجل داخل transaction
   *
   * يستخدم DB-level increment لـ paidAmount — لا حساب في JavaScript.
   *
   * @param tx - Prisma transaction client
   * @param id - معرف البيع الآجل
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param data - البيانات الجديدة
   * @returns السجل المحدَّث
   */
  async updateStatus(
    tx: Prisma.TransactionClient,
    id: string,
    companyId: string,
    data: UpdateDeferredSaleStatusData,
  ) {
    return tx.deferredSale.update({
      where: { id, companyId },
      data: {
        // DB-level increment — NO JavaScript arithmetic
        paidAmount: { increment: data.paymentAmount },
        status: data.status,
        // Optimistic concurrency: increment version on every write
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // SOFT DELETE
  // ══════════════════════════════════════════════════════════════

  /**
   * حذف ناعم للبيع الآجل داخل transaction
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param id - معرف البيع الآجل
   * @returns السجل المحدَّث
   */
  async softDelete(
    tx: Prisma.TransactionClient,
    companyId: string,
    id: string,
  ) {
    return tx.deferredSale.update({
      where: { id, companyId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // PARTY VALIDATION
  // ══════════════════════════════════════════════════════════════

  /**
   * التحقق من وجود الطرف في الشركة (يستعلم مباشرة لتجنب circular dependencies)
   *
   * @param companyId - معرف الشركة
   * @param partyType - نوع الطرف (CUSTOMER / SUPPLIER / EMPLOYEE)
   * @param partyId - معرف الطرف
   * @returns true إذا كان الطرف موجوداً وغير محذوف
   */
  async partyExists(
    companyId: string,
    partyType: PartyType,
    partyId: string,
  ): Promise<boolean> {
    let count = 0;

    switch (partyType) {
      case PartyType.CUSTOMER:
        count = await this.prisma.customer.count({
          where: { id: partyId, companyId, isDeleted: false },
        });
        break;
      case PartyType.SUPPLIER:
        count = await this.prisma.supplier.count({
          where: { id: partyId, companyId, isDeleted: false },
        });
        break;
      case PartyType.EMPLOYEE:
        count = await this.prisma.employee.count({
          where: { id: partyId, companyId, isDeleted: false },
        });
        break;
      default:
        return false;
    }

    return count > 0;
  }

  // ══════════════════════════════════════════════════════════════
  // PARTY NAME LOOKUP
  // ══════════════════════════════════════════════════════════════

  /**
   * جلب اسم الطرف من الجدول المناسب
   *
   * @param companyId - معرف الشركة
   * @param partyType - نوع الطرف
   * @param partyId - معرف الطرف
   * @returns اسم الطرف أو null إذا لم يوجد
   */
  async getPartyName(
    companyId: string,
    partyType: PartyType,
    partyId: string,
  ): Promise<string | null> {
    switch (partyType) {
      case PartyType.CUSTOMER: {
        const party = await this.prisma.customer.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { name: true },
        });
        return party?.name ?? null;
      }
      case PartyType.SUPPLIER: {
        const party = await this.prisma.supplier.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { name: true },
        });
        return party?.name ?? null;
      }
      case PartyType.EMPLOYEE: {
        const party = await this.prisma.employee.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { name: true },
        });
        return party?.name ?? null;
      }
      default:
        return null;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // LEDGER ENTRY HELPERS (inside transactions)
  // ══════════════════════════════════════════════════════════════

  /**
   * إنشاء LedgerEntry داخل transaction
   *
   * @param tx - Prisma transaction client
   * @param data - بيانات الحركة المالية
   * @returns الحركة المالية المنشأة
   */
  async createLedgerEntry(
    tx: Prisma.TransactionClient,
    data: {
      companyId: string;
      partyType: PartyType;
      partyId: string;
      entryType: LedgerEntryType;
      signedAmount: number;
      entryDate: Date;
      dueDate?: Date | null;
      note?: string | null;
      saleType?: SaleType | null;
      createdById: string;
    },
  ) {
    return tx.ledgerEntry.create({
      data: {
        companyId: data.companyId,
        partyType: data.partyType,
        partyId: data.partyId,
        entryType: data.entryType,
        signedAmount: data.signedAmount,
        entryDate: data.entryDate,
        dueDate: data.dueDate ?? null,
        note: data.note ?? null,
        saleType: data.saleType ?? null,
        createdById: data.createdById,
        isDeleted: false,
      },
    });
  }

  /**
   * حذف ناعم لحركة مالية داخل transaction
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param ledgerEntryId - معرف الحركة المالية
   */
  async softDeleteLedgerEntry(
    tx: Prisma.TransactionClient,
    companyId: string,
    ledgerEntryId: string,
  ) {
    return tx.ledgerEntry.update({
      where: { id: ledgerEntryId, companyId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // DEFERRED PAYMENT CREATION (inside transaction)
  // ══════════════════════════════════════════════════════════════

  /**
   * إنشاء سجل DeferredPayment داخل transaction
   *
   * @param tx - Prisma transaction client
   * @param data - بيانات الدفعة
   * @returns الدفعة المنشأة
   */
  async createPayment(
    tx: Prisma.TransactionClient,
    data: {
      companyId: string;
      deferredSaleId: string;
      ledgerEntryId: string;
      amount: number;
      paymentDate: Date;
      paymentMethod?: string | null;
      notes?: string | null;
      createdById: string;
    },
  ) {
    return tx.deferredPayment.create({
      data: {
        companyId: data.companyId,
        deferredSaleId: data.deferredSaleId,
        ledgerEntryId: data.ledgerEntryId,
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod ?? null,
        notes: data.notes ?? null,
        createdById: data.createdById,
        createdAt: new Date(),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BALANCE OPERATIONS (inside transactions)
  // ══════════════════════════════════════════════════════════════

  /**
   * زيادة الرصيد للطرف داخل transaction (عند إنشاء بيع آجل)
   *
   * يستخدم DB-level upsert + increment — لا حساب في JavaScript.
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param partyType - نوع الطرف
   * @param partyId - معرف الطرف
   * @param amount - المبلغ المُضاف (موجب)
   */
  async incrementBalance(
    tx: Prisma.TransactionClient,
    companyId: string,
    partyType: PartyType,
    partyId: string,
    amount: number,
  ) {
    return tx.balance.upsert({
      where: {
        companyId_partyType_partyId: { companyId, partyType, partyId },
      },
      update: {
        // DB-level increment — NO JavaScript arithmetic
        balance: { increment: amount },
      },
      create: {
        companyId,
        partyType,
        partyId,
        balance: amount,
      },
    });
  }

  /**
   * تقليل الرصيد للطرف داخل transaction (عند تسجيل دفعة أو إلغاء)
   *
   * يستخدم DB-level decrement — لا حساب في JavaScript.
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param partyType - نوع الطرف
   * @param partyId - معرف الطرف
   * @param amount - المبلغ المُخصوم (موجب — يُطرح من الرصيد)
   */
  async decrementBalance(
    tx: Prisma.TransactionClient,
    companyId: string,
    partyType: PartyType,
    partyId: string,
    amount: number,
  ) {
    return tx.balance.update({
      where: {
        companyId_partyType_partyId: { companyId, partyType, partyId },
      },
      data: {
        // DB-level decrement — NO JavaScript arithmetic
        balance: { decrement: amount },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // AUDIT LOG (inside transactions)
  // ══════════════════════════════════════════════════════════════

  /**
   * تسجيل AuditLog داخل transaction
   *
   * @param tx - Prisma transaction client
   * @param data - بيانات السجل
   */
  async createAuditLog(
    tx: Prisma.TransactionClient,
    data: {
      companyId: string;
      actorUserId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, any>;
    },
  ) {
    return tx.auditLog.create({
      data: {
        companyId: data.companyId,
        actorUserId: data.actorUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata ?? {},
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // TRANSACTION WRAPPER
  // ══════════════════════════════════════════════════════════════

  /**
   * تنفيذ عملية داخل Prisma $transaction
   *
   * @param fn - الدالة التي تستلم Prisma Transaction Client
   * @returns نتيجة الدالة
   */
  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

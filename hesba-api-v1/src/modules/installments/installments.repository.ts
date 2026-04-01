// ============================================================
// Installments Repository — Data Access Layer
// ============================================================
//
// ⚠️  FINANCIAL PRECISION — CRITICAL DESIGN DECISIONS:
//
//   1. NEVER perform balance arithmetic in JavaScript/TypeScript.
//      Use Prisma DB-level increment/decrement for all monetary updates.
//
//   2. Schedule amount calculations (JS side) use Prisma.Decimal:
//        new Prisma.Decimal(x).div(new Prisma.Decimal(y))  ← exact
//
//   3. All write operations MUST be called inside a $transaction().
//      Write methods here accept a `tx` (transaction client) parameter.
//
//   4. companyId is present in EVERY query for multi-tenant isolation.
//
//   5. isDeleted: false is always included in read queries.
//
// Architecture:
//   - InstallmentContract: master record with status lifecycle
//   - InstallmentSchedule: child payment schedule rows
//   - InstallmentPayment: actual payment records (immutable)
//   - LedgerEntry: financial footprint (INVOICE on create, PAYMENT on payment)
//   - Balance: real-time balance — NEVER touch directly outside repository
//   - AuditLog: inside every write transaction
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  PartyType,
  InstallmentStatus,
  ScheduleStatus,
  LedgerEntryType,
  SaleType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { QueryContractsDto } from './dto/query-contracts.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';

// ── Types ──────────────────────────────────────────────────────────────────

/** Data required to create a new contract inside a transaction */
export interface CreateContractData {
  companyId: string;
  partyType: PartyType;
  partyId: string;
  ledgerEntryId: string;
  contractNumber: string;
  description?: string | null;
  totalAmount: Prisma.Decimal;
  downPayment: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  numberOfInstallments: number;
  scheduleType: 'FIXED' | 'CUSTOM';
  startDate: Date;
  createdById: string;
}

/** One schedule row to create */
export interface CreateScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  amount: Prisma.Decimal;
  notes?: string | null;
}

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Repository ─────────────────────────────────────────────────────────────

@Injectable()
export class InstallmentsRepository {
  private readonly logger = new Logger(InstallmentsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════
  // CONTRACT NUMBER GENERATION
  // ══════════════════════════════════════════════════════════════

  /**
   * يولّد رقم عقد فريد بصيغة CNT-{YEAR}-{NNNN}.
   * يُحسب التسلسل بناءً على عدد عقود الشركة في نفس السنة.
   *
   * @param companyId - معرف الشركة (multi-tenant)
   * @param year - السنة الميلادية (e.g. 2026)
   * @returns رقم العقد مثلاً: "CNT-2026-0042"
   */
  async generateContractNumber(
    companyId: string,
    year: number,
  ): Promise<string> {
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const count = await this.prisma.installmentContract.count({
      where: {
        companyId,
        createdAt: { gte: startOfYear, lt: endOfYear },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `CNT-${year}-${seq}`;
  }

  // ══════════════════════════════════════════════════════════════
  // PARTY VALIDATION
  // ══════════════════════════════════════════════════════════════

  /**
   * التحقق من وجود الطرف في الشركة (عميل / مورد / موظف).
   * يستعلم مباشرة بدلاً من استيراد موديولات الأطراف لتجنب circular dependencies.
   *
   * @param companyId - معرف الشركة
   * @param partyType - نوع الطرف
   * @param partyId - معرف الطرف
   * @returns true إذا كان الطرف موجوداً وغير محذوف
   */
  async partyExists(
    companyId: string,
    partyType: PartyType,
    partyId: string,
  ): Promise<boolean> {
    switch (partyType) {
      case PartyType.CUSTOMER:
        return (
          (await this.prisma.customer.count({
            where: { id: partyId, companyId, isDeleted: false },
          })) > 0
        );
      case PartyType.SUPPLIER:
        return (
          (await this.prisma.supplier.count({
            where: { id: partyId, companyId, isDeleted: false },
          })) > 0
        );
      case PartyType.EMPLOYEE:
        return (
          (await this.prisma.employee.count({
            where: { id: partyId, companyId, isDeleted: false },
          })) > 0
        );
      default:
        return false;
    }
  }

  /**
   * جلب اسم الطرف لعرضه في التفاصيل.
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
        const r = await this.prisma.customer.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { name: true },
        });
        return r?.name ?? null;
      }
      case PartyType.SUPPLIER: {
        const r = await this.prisma.supplier.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { name: true },
        });
        return r?.name ?? null;
      }
      case PartyType.EMPLOYEE: {
        const r = await this.prisma.employee.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { name: true },
        });
        return r?.name ?? null;
      }
      default:
        return null;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // LEDGER ENTRY (inside transactions)
  // ══════════════════════════════════════════════════════════════

  /**
   * إنشاء حركة مالية في الدفتر داخل transaction.
   *
   * @param tx - Prisma transaction client
   * @param data - بيانات الحركة المالية
   * @returns LedgerEntry المنشأ
   */
  async createLedgerEntry(
    tx: Prisma.TransactionClient,
    data: {
      companyId: string;
      partyType: PartyType;
      partyId: string;
      entryType: LedgerEntryType;
      signedAmount: Prisma.Decimal;
      entryDate: Date;
      note?: string | null;
      saleType?: SaleType;
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
        note: data.note ?? null,
        saleType: data.saleType ?? SaleType.INSTALLMENT,
        createdById: data.createdById,
      },
    });
  }

  /**
   * إلغاء (soft-delete) حركة مالية داخل transaction.
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param ledgerEntryId - معرف الحركة المالية
   */
  async softDeleteLedgerEntry(
    tx: Prisma.TransactionClient,
    companyId: string,
    ledgerEntryId: string,
  ): Promise<void> {
    await tx.ledgerEntry.updateMany({
      where: { id: ledgerEntryId, companyId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BALANCE (DB-level arithmetic only)
  // ══════════════════════════════════════════════════════════════

  /**
   * تحديث رصيد الطرف بمبلغ موجب (زيادة دين) داخل transaction.
   * يُستخدم عند إنشاء فاتورة التقسيط.
   *
   * DB-level: UPDATE balance SET balance = balance + amount
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param partyType - نوع الطرف
   * @param partyId - معرف الطرف
   * @param amount - المبلغ (Decimal)
   */
  async incrementBalance(
    tx: Prisma.TransactionClient,
    companyId: string,
    partyType: PartyType,
    partyId: string,
    amount: Prisma.Decimal,
  ): Promise<void> {
    await tx.balance.upsert({
      where: { companyId_partyType_partyId: { companyId, partyType, partyId } },
      update: { balance: { increment: amount } },
      create: { companyId, partyType, partyId, balance: amount },
    });
  }

  /**
   * تخفيض رصيد الطرف (سداد دفعة) داخل transaction.
   * DB-level: UPDATE balance SET balance = balance - amount
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param partyType - نوع الطرف
   * @param partyId - معرف الطرف
   * @param amount - المبلغ المراد خصمه (Decimal)
   */
  async decrementBalance(
    tx: Prisma.TransactionClient,
    companyId: string,
    partyType: PartyType,
    partyId: string,
    amount: Prisma.Decimal,
  ): Promise<void> {
    await tx.balance.update({
      where: { companyId_partyType_partyId: { companyId, partyType, partyId } },
      data: { balance: { decrement: amount } },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CREATE CONTRACT & SCHEDULES
  // ══════════════════════════════════════════════════════════════

  /**
   * إنشاء عقد التقسيط داخل transaction.
   *
   * @param tx - Prisma transaction client
   * @param data - بيانات العقد
   * @returns InstallmentContract المنشأ
   */
  async createContract(tx: Prisma.TransactionClient, data: CreateContractData) {
    return tx.installmentContract.create({
      data: {
        companyId: data.companyId,
        partyType: data.partyType,
        partyId: data.partyId,
        ledgerEntryId: data.ledgerEntryId,
        contractNumber: data.contractNumber,
        description: data.description ?? null,
        totalAmount: data.totalAmount,
        downPayment: data.downPayment,
        paidAmount: data.paidAmount,
        numberOfInstallments: data.numberOfInstallments,
        scheduleType: data.scheduleType,
        startDate: data.startDate,
        status: InstallmentStatus.ACTIVE,
        createdById: data.createdById,
        version: 0,
      },
    });
  }

  /**
   * إنشاء قائمة الأقساط لعقد داخل transaction.
   * يستخدم createMany للأداء — صفقة واحدة لكل الأقساط.
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param contractId - معرف العقد
   * @param items - قائمة الأقساط
   */
  async createSchedules(
    tx: Prisma.TransactionClient,
    companyId: string,
    contractId: string,
    items: CreateScheduleItem[],
  ): Promise<void> {
    await tx.installmentSchedule.createMany({
      data: items.map((item) => ({
        companyId,
        contractId,
        installmentNumber: item.installmentNumber,
        dueDate: item.dueDate,
        amount: item.amount,
        paidAmount: new Prisma.Decimal(0),
        status: ScheduleStatus.PENDING,
        notes: item.notes ?? null,
      })),
    });
  }

  /**
   * إنشاء سجل دفعة قسط داخل transaction.
   *
   * @param tx - Prisma transaction client
   * @param data - بيانات الدفعة
   * @returns InstallmentPayment المنشأ
   */
  async createPayment(
    tx: Prisma.TransactionClient,
    data: {
      companyId: string;
      contractId: string;
      scheduleId: string;
      ledgerEntryId: string;
      amount: Prisma.Decimal;
      paymentDate: Date;
      paymentMethod?: string | null;
      notes?: string | null;
      createdById: string;
    },
  ) {
    return tx.installmentPayment.create({
      data: {
        companyId: data.companyId,
        contractId: data.contractId,
        scheduleId: data.scheduleId,
        ledgerEntryId: data.ledgerEntryId,
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod ?? null,
        notes: data.notes ?? null,
        createdById: data.createdById,
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // READ CONTRACT
  // ══════════════════════════════════════════════════════════════

  /**
   * جلب عقد واحد بمعرفه مع أقساطه الاختيارية.
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param id - معرف العقد
   * @param includeSchedules - هل نجلب الأقساط؟ (افتراضي: true)
   * @param includePayments - هل نجلب الدفعات داخل كل قسط؟
   * @returns العقد أو null
   */
  async findContractById(
    companyId: string,
    id: string,
    includeSchedules = true,
    includePayments = false,
  ) {
    return this.prisma.installmentContract.findFirst({
      where: { id, companyId, isDeleted: false },
      include: includeSchedules
        ? {
            schedules: {
              where: { companyId },
              orderBy: { installmentNumber: 'asc' },
              include: includePayments
                ? {
                    payments: {
                      where: { companyId },
                      orderBy: { paymentDate: 'asc' },
                    },
                  }
                : undefined,
            },
          }
        : undefined,
    });
  }

  /**
   * جلب عقد داخل transaction (للقفل أثناء الكتابة).
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param id - معرف العقد
   * @returns العقد أو null
   */
  async findContractByIdTx(
    tx: Prisma.TransactionClient,
    companyId: string,
    id: string,
  ) {
    return tx.installmentContract.findFirst({
      where: { id, companyId, isDeleted: false },
    });
  }

  /**
   * جلب قائمة العقود مع pagination وفلاتر متعددة.
   *
   * @param companyId - معرف الشركة
   * @param params - معاملات الاستعلام والفلاتر
   * @returns نتيجة مُجمَّعة مع meta
   */
  async findContracts(
    companyId: string,
    params: QueryContractsDto,
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      partyType,
      partyId,
      status,
      scheduleStatus,
      dateFrom,
      dateTo,
      search,
    } = params;

    const skip = (page - 1) * limit;

    // Build WHERE for contracts
    const where: Prisma.InstallmentContractWhereInput = {
      companyId,
      isDeleted: false,
      ...(partyType && { partyType }),
      ...(partyId && { partyId }),
      ...(status && { status }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(`${dateTo}T23:59:59.999Z`) }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { contractNumber: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      // If scheduleStatus filter: has schedules with that status
      ...(scheduleStatus && {
        schedules: {
          some: { status: scheduleStatus, companyId },
        },
      }),
    };

    const allowedSortFields = [
      'createdAt',
      'contractNumber',
      'totalAmount',
      'startDate',
      'status',
    ];
    const safeSort = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [total, items] = await this.prisma.$transaction([
      this.prisma.installmentContract.count({ where }),
      this.prisma.installmentContract.findMany({
        where,
        orderBy: { [safeSort]: sortOrder },
        skip,
        take: limit,
        include: {
          schedules: {
            where: { companyId },
            orderBy: { installmentNumber: 'asc' },
            select: {
              id: true,
              installmentNumber: true,
              dueDate: true,
              amount: true,
              paidAmount: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ══════════════════════════════════════════════════════════════
  // READ SCHEDULE
  // ══════════════════════════════════════════════════════════════

  /**
   * جلب قسط واحد بمعرفه ومعرف العقد للتحقق من الانتماء.
   *
   * @param companyId - معرف الشركة
   * @param scheduleId - معرف القسط
   * @param contractId - معرف العقد (للتحقق من الانتماء)
   * @returns InstallmentSchedule أو null
   */
  async findScheduleById(
    companyId: string,
    scheduleId: string,
    contractId: string,
  ) {
    return this.prisma.installmentSchedule.findFirst({
      where: { id: scheduleId, companyId, contractId },
    });
  }

  /**
   * جلب قسط داخل transaction.
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param scheduleId - معرف القسط
   * @param contractId - معرف العقد
   * @returns InstallmentSchedule أو null
   */
  async findScheduleByIdTx(
    tx: Prisma.TransactionClient,
    companyId: string,
    scheduleId: string,
    contractId: string,
  ) {
    return tx.installmentSchedule.findFirst({
      where: { id: scheduleId, companyId, contractId },
    });
  }

  /**
   * جلب الأقساط المستحقة خلال فترة زمنية مع pagination.
   *
   * @param companyId - معرف الشركة
   * @param params - معاملات الاستعلام
   * @returns نتيجة مُجمَّعة مع meta
   */
  async getUpcomingSchedule(
    companyId: string,
    params: QueryScheduleDto,
  ): Promise<PaginatedResult<any>> {
    const {
      dateFrom,
      dateTo,
      status = [ScheduleStatus.PENDING, ScheduleStatus.PARTIAL, ScheduleStatus.OVERDUE],
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.InstallmentScheduleWhereInput = {
      companyId,
      status: { in: status },
      dueDate: {
        gte: new Date(dateFrom),
        lte: new Date(`${dateTo}T23:59:59.999Z`),
      },
      contract: { isDeleted: false, status: InstallmentStatus.ACTIVE },
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.installmentSchedule.count({ where }),
      this.prisma.installmentSchedule.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
        include: {
          contract: {
            select: {
              id: true,
              contractNumber: true,
              partyType: true,
              partyId: true,
              totalAmount: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ══════════════════════════════════════════════════════════════
  // UPDATE SCHEDULE & CONTRACT
  // ══════════════════════════════════════════════════════════════

  /**
   * تحديث بيانات قسط داخل transaction.
   * يُستخدم عند تسجيل دفعة (paidAmount += amount، تغيير status).
   *
   * @param tx - Prisma transaction client
   * @param scheduleId - معرف القسط
   * @param data - البيانات المحدّثة
   */
  async updateSchedule(
    tx: Prisma.TransactionClient,
    scheduleId: string,
    data: Prisma.InstallmentScheduleUpdateInput,
  ): Promise<void> {
    await tx.installmentSchedule.update({
      where: { id: scheduleId },
      data,
    });
  }

  /**
   * تحديث بيانات العقد داخل transaction.
   *
   * @param tx - Prisma transaction client
   * @param contractId - معرف العقد
   * @param companyId - معرف الشركة (multi-tenant safety)
   * @param data - البيانات المحدّثة
   */
  async updateContract(
    tx: Prisma.TransactionClient,
    contractId: string,
    companyId: string,
    // Use UncheckedUpdateInput so we can pass scalar companyId without
    // conflicting with the 'company' relation field (Prisma XOR constraint).
    data: Prisma.InstallmentContractUncheckedUpdateInput,
  ): Promise<void> {
    await tx.installmentContract.update({
      where: { id: contractId, companyId },
      data,
    });
  }

  /**
   * Soft-delete عقد داخل transaction.
   * يُعيّن isDeleted=true وstatus=CANCELLED.
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param id - معرف العقد
   */
  async softDeleteContract(
    tx: Prisma.TransactionClient,
    companyId: string,
    id: string,
  ): Promise<void> {
    await tx.installmentContract.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: InstallmentStatus.CANCELLED,
        companyId, // للتأكد من multi-tenant safety
      },
    });
  }

  /**
   * Soft-delete جميع الأقساط PENDING/PARTIAL للعقد داخل transaction.
   * يُستخدم عند إلغاء العقد لتنظيف الجدول.
   *
   * @param tx - Prisma transaction client
   * @param companyId - معرف الشركة
   * @param contractId - معرف العقد
   */
  async softDeletePendingSchedules(
    tx: Prisma.TransactionClient,
    companyId: string,
    contractId: string,
  ): Promise<void> {
    await tx.installmentSchedule.updateMany({
      where: {
        contractId,
        companyId,
        status: { in: [ScheduleStatus.PENDING, ScheduleStatus.PARTIAL] },
      },
      data: { status: ScheduleStatus.WAIVED },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // COUNT QUERIES
  // ══════════════════════════════════════════════════════════════

  /**
   * يحسب عدد الأقساط غير المسددة بالكامل.
   * إذا عاد الناتج = 0 فالعقد مكتمل (COMPLETED).
   *
   * @param tx - Prisma transaction client
   * @param contractId - معرف العقد
   * @returns عدد الأقساط غير المسددة (PAID / WAIVED مستثنيان)
   */
  async countUnpaidSchedules(
    tx: Prisma.TransactionClient,
    contractId: string,
  ): Promise<number> {
    return tx.installmentSchedule.count({
      where: {
        contractId,
        status: { notIn: [ScheduleStatus.PAID, ScheduleStatus.WAIVED] },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // AUDIT LOG
  // ══════════════════════════════════════════════════════════════

  /**
   * تسجيل حدث في سجل المراجعة داخل transaction.
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
  ): Promise<void> {
    await tx.auditLog.create({
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
}

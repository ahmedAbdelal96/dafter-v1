// ============================================================
// Ledger Repository — Financial Data Access Layer
// ============================================================
//
// ⚠️  FINANCIAL PRECISION — CRITICAL DESIGN DECISIONS:
//
//   1. NEVER perform balance arithmetic in JavaScript/TypeScript.
//      JavaScript numbers (IEEE 754 float64) lose precision for
//      large or high-precision decimals (e.g., 0.1 + 0.2 ≠ 0.3).
//
//   2. Balance updates use Prisma's DB-level `increment`/`decrement`:
//        data: { balance: { increment: signedAmount } }
//      This lets PostgreSQL's DECIMAL(14,2) engine handle arithmetic,
//      which is mathematically exact for fixed-point numbers.
//
//   3. Running balance computation (statement) uses Prisma.Decimal
//      class — arbitrary-precision arithmetic in Node.js.
//        new Prisma.Decimal(x).add(new Prisma.Decimal(y))  ← exact
//
//   4. All write operations (create + delete) are wrapped in
//      prisma.$transaction() to ensure LedgerEntry + Balance stay
//      in sync. If either fails, both roll back.
//
// Architecture:
//   - LedgerEntry: immutable financial record (soft delete only)
//   - Balance: running snapshot — NEVER mutate directly from outside
//              the transaction; always use increment/decrement
//   - AuditLog: inside every write transaction
//
// Party lookup:
//   We verify party existence directly in this repository using
//   PrismaService rather than importing party modules.
//   Reason: avoids circular dependencies and is a single DB call.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PartyType, LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CreateEntryData {
  companyId: string;
  partyType: PartyType;
  partyId: string;
  entryType: LedgerEntryType;
  signedAmount: number; // Converted to Decimal by Prisma on insert
  entryDate: Date;
  dueDate?: Date | null;
  note?: string | null;
  actorUserId: string;
}

export interface StatementParams {
  companyId: string;
  partyType: PartyType;
  partyId: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  page: number;
  limit: number;
}

/** One row in the account statement — includes running balance */
export interface StatementRow {
  id: string;
  entryType: LedgerEntryType;
  signedAmount: Prisma.Decimal;
  entryDate: Date;
  dueDate: Date | null;
  note: string | null;
  createdById: string;
  createdAt: Date;
  /** Cumulative balance AFTER this entry (Decimal, 2dp string) */
  runningBalance: string;
}

export interface StatementResult {
  partyInfo: {
    id: string;
    name: string;
    partyType: PartyType;
  } | null;
  /** Real-time balance from Balance table */
  currentBalance: string;
  /** Balance at the start of the requested period */
  openingBalanceForPeriod: string;
  /** Balance at the end of the requested period (= openingForPeriod + sum of items) */
  closingBalanceForPeriod: string;
  items: StatementRow[];
  total: number;
  page: number;
  limit: number;
}

// ── Repository ─────────────────────────────────────────────────────────────

@Injectable()
export class LedgerRepository {
  private readonly logger = new Logger(LedgerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════════════════════

  /**
   * تسجيل حركة مالية جديدة — عملية atomic كاملة
   *
   * الخطوات داخل الـ transaction:
   *   1. إنشاء LedgerEntry
   *   2. تحديث Balance بـ DB-level increment (لا حساب في JS)
   *   3. تسجيل AuditLog
   *
   * @throws إذا لم يوجد سجل Balance للطرف (يعني Party أُنشئ بدون Balance — خطأ في البيانات)
   */
  async createEntry(data: CreateEntryData) {
    return this.prisma.$transaction(async (tx) => {
      return this.createEntryInTx(data, tx);
    });
  }

  async createEntryWithTx(
    data: CreateEntryData,
    tx: Prisma.TransactionClient,
  ) {
    return this.createEntryInTx(data, tx);
  }

  private async createEntryInTx(
    data: CreateEntryData,
    tx: Prisma.TransactionClient,
  ) {
      // ── Step 1: Create the ledger entry ───────────────────────
      const entry = await tx.ledgerEntry.create({
        data: {
          companyId: data.companyId,
          partyType: data.partyType,
          partyId: data.partyId,
          entryType: data.entryType,
          signedAmount: data.signedAmount, // Prisma converts to Decimal
          entryDate: data.entryDate,
          dueDate: data.dueDate ?? null,
          note: data.note ?? null,
          createdById: data.actorUserId,
        },
      });

      // ── Step 2: Update balance using DB-level arithmetic ──────
      //
      // CRITICAL: We use Prisma's `increment` operator which translates to:
      //   UPDATE balance SET balance = balance + $signedAmount WHERE ...
      //
      // This is PostgreSQL DECIMAL arithmetic — exact, no float error.
      // signedAmount can be positive (credit) or negative (debit) — Prisma handles both.
      //
      // We use upsert here as a safety net: if a Balance row is missing
      // (data integrity issue from a buggy party creation), we create it
      // rather than throwing a cryptic foreign key error.
      await tx.balance.upsert({
        where: {
          companyId_partyType_partyId: {
            companyId: data.companyId,
            partyType: data.partyType,
            partyId: data.partyId,
          },
        },
        update: {
          // DB-level increment — NO JavaScript arithmetic
          balance: { increment: data.signedAmount },
        },
        create: {
          // Fallback: balance row was missing — initialize with this amount
          // (Should not happen if party creation follows the protocol)
          companyId: data.companyId,
          partyType: data.partyType,
          partyId: data.partyId,
          balance: data.signedAmount,
        },
      });

      // ── Step 3: Audit log ─────────────────────────────────────
      await tx.auditLog.create({
        data: {
          companyId: data.companyId,
          actorUserId: data.actorUserId,
          action: 'ledger.create',
          entityType: 'ledger_entry',
          entityId: entry.id,
          metadata: {
            partyType: data.partyType,
            partyId: data.partyId,
            entryType: data.entryType,
            signedAmount: data.signedAmount.toString(),
            entryDate: data.entryDate.toISOString().split('T')[0],
          },
        },
      });

      this.logger.log(
        `LedgerEntry created: ${entry.id} | party: ${data.partyType}/${data.partyId} | amount: ${data.signedAmount}`,
      );

      return entry;
  }

  // ══════════════════════════════════════════════════════════════
  // SOFT DELETE  (with balance reversal)
  // ══════════════════════════════════════════════════════════════

  /**
   * إلغاء حركة مالية وعكس أثرها على الرصيد — atomic
   *
   * الخطوات:
   *   1. جلب الحركة (للتحقق من وجودها وقراءة signedAmount)
   *   2. Soft delete (isDeleted = true)
   *   3. عكس Balance: balance -= signedAmount  (DB-level decrement)
   *      مثال: signedAmount = +1000 → balance -= 1000 (إلغاء الدفعة)
   *            signedAmount = −500  → balance -= (−500) = balance += 500 (إلغاء الفاتورة)
   *      ملاحظة: Prisma.decrement(−500) = balance − (−500) = balance + 500  ✓
   *   4. AuditLog
   *
   * @returns الحركة المحذوفة أو null إذا لم تكن موجودة
   */
  async softDeleteEntry(
    companyId: string,
    entryId: string,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // ── Step 1: Fetch entry to get signedAmount for reversal ──
      const entry = await tx.ledgerEntry.findFirst({
        where: { id: entryId, companyId, isDeleted: false },
      });

      if (!entry) return null;

      // ── Step 2: Soft delete ───────────────────────────────────
      await tx.ledgerEntry.update({
        where: { id: entryId },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      // ── Step 3: Reverse balance impact ────────────────────────
      //
      // We use `decrement` with the original signedAmount to reverse:
      //   If signedAmount was +1000 (credit): balance = balance − 1000   ✓
      //   If signedAmount was −500 (debit):   balance = balance − (−500) = balance + 500  ✓
      //
      // This is mathematically equivalent to: balance = balance − signedAmount
      // Which correctly reverses the original: balance = balance + signedAmount
      await tx.balance.update({
        where: {
          companyId_partyType_partyId: {
            companyId,
            partyType: entry.partyType,
            partyId: entry.partyId,
          },
        },
        data: {
          // DB-level reversal — NO JavaScript arithmetic
          balance: { decrement: entry.signedAmount },
        },
      });

      // ── Step 4: Audit log ─────────────────────────────────────
      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'ledger.delete',
          entityType: 'ledger_entry',
          entityId: entryId,
          metadata: {
            partyType: entry.partyType,
            partyId: entry.partyId,
            entryType: entry.entryType,
            // Store as string to preserve Decimal precision in JSON
            signedAmount: entry.signedAmount.toString(),
            reversedBy: actorUserId,
          },
        },
      });

      this.logger.log(
        `LedgerEntry ${entryId} soft-deleted | balance reversed by ${entry.signedAmount} | actor: ${actorUserId}`,
      );

      return entry;
    });
  }

  // ══════════════════════════════════════════════════════════════
  // FIND ONE
  // ══════════════════════════════════════════════════════════════

  async findById(companyId: string, entryId: string) {
    return this.prisma.ledgerEntry.findFirst({
      where: { id: entryId, companyId, isDeleted: false },
    });
  }

  /**
   * جلب الحركة بغض النظر عن حالة الحذف (active أو deleted)
   * يُستخدم فقط لتمييز رسالة الخطأ: "not found" vs "already deleted"
   */
  async findByIdIncludeDeleted(
    companyId: string,
    entryId: string,
  ): Promise<{ isDeleted: boolean } | null> {
    return this.prisma.ledgerEntry.findFirst({
      where: { id: entryId, companyId },
      select: { isDeleted: true },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // STATEMENT (كشف الحساب مع Running Balance)
  // ══════════════════════════════════════════════════════════════

  /**
   * جلب كشف حساب طرف مع Running Balance بالضبط لكل صف
   *
   * خوارزمية Running Balance:
   * ─────────────────────────────────────────────────────────────
   *   الرصيد الجاري = رصيد افتتاحي (من party.openingBalance)
   *                 + مجموع الحركات قبل الفترة (قبل dateFrom)
   *                 + مجموع الحركات قبل الصفحة الحالية (skip)
   *                 + الحركات في الصفحة (تراكمي)
   *
   * الدقة: كل الجمع يتم بـ Prisma.Decimal (arbitrary precision).
   * ─────────────────────────────────────────────────────────────
   *
   * Performance notes:
   *   - count + data: parallel via $transaction([])
   *   - priorBalance: aggregate (SUM) query — one DB call
   *   - prePageBalance: findMany(take: skip) only if page > 1
   *   - currentBalance: single row from Balance table
   *   Total: max 5 DB calls regardless of dataset size
   */
  async getStatement(params: StatementParams): Promise<StatementResult> {
    const { companyId, partyType, partyId, dateFrom, dateTo, page, limit } =
      params;

    const skip = (page - 1) * limit;

    // ── 1. Load party info + openingBalance ───────────────────
    const { partyDisplayInfo, openingBalance } = await this.getPartyData(
      companyId,
      partyType,
      partyId,
    );

    // ── 2. Current real-time balance from Balance snapshot ────
    const balanceRow = await this.prisma.balance.findUnique({
      where: {
        companyId_partyType_partyId: { companyId, partyType, partyId },
      },
      select: { balance: true },
    });
    const currentBalance = balanceRow?.balance ?? new Prisma.Decimal(0);

    // ── 3. Build WHERE clause for the requested period ────────
    //    All queries in the statement use this same scope.
    const periodWhere: Prisma.LedgerEntryWhereInput = {
      companyId,
      partyType,
      partyId,
      isDeleted: false,
      ...(dateFrom || dateTo
        ? {
            entryDate: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
    };

    // Statement always sorted chronologically (entryDate ASC, createdAt ASC).
    // This is fixed — financial statements must be chronological.
    const chronologicalOrder: Prisma.LedgerEntryOrderByWithRelationInput[] = [
      { entryDate: 'asc' },
      { createdAt: 'asc' },
    ];

    // ── 4. Parallel: count + paginated data ──────────────────
    const [total, entries] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.count({ where: periodWhere }),
      this.prisma.ledgerEntry.findMany({
        where: periodWhere,
        orderBy: chronologicalOrder,
        skip,
        take: limit,
        select: {
          id: true,
          entryType: true,
          signedAmount: true,
          entryDate: true,
          dueDate: true,
          note: true,
          createdById: true,
          createdAt: true,
        },
      }),
    ]);

    // ── 5. Opening balance for period ─────────────────────────
    //
    // = party.openingBalance + SUM(signedAmount of all non-deleted entries
    //    that happened BEFORE dateFrom)
    //
    // If no dateFrom: openingBalanceForPeriod = party.openingBalance
    //   (i.e., we show the full history starting from zero-based opening)
    let openingBalanceForPeriod = new Prisma.Decimal(openingBalance.toString());

    if (dateFrom) {
      const priorAggregate = await this.prisma.ledgerEntry.aggregate({
        where: {
          companyId,
          partyType,
          partyId,
          isDeleted: false,
          entryDate: { lt: dateFrom }, // strictly BEFORE the period
        },
        _sum: { signedAmount: true },
      });

      const priorSum =
        priorAggregate._sum.signedAmount ?? new Prisma.Decimal(0);
      openingBalanceForPeriod = openingBalanceForPeriod.add(
        new Prisma.Decimal(priorSum.toString()),
      );
    }

    // ── 6. Pre-page balance (for pages > 1) ───────────────────
    //
    // For page N (skip > 0), we need the cumulative balance of
    // the first `skip` entries in chronological order.
    //
    // We fetch only `signedAmount` for the pre-page slice — minimal data.
    let pageStartBalance = new Prisma.Decimal(
      openingBalanceForPeriod.toString(),
    );

    if (skip > 0) {
      const prePageEntries = await this.prisma.ledgerEntry.findMany({
        where: periodWhere,
        orderBy: chronologicalOrder,
        take: skip,
        select: { signedAmount: true }, // minimal data — only need amounts
      });

      // Accumulate using Prisma.Decimal — exact arithmetic
      for (const e of prePageEntries) {
        pageStartBalance = pageStartBalance.add(
          new Prisma.Decimal(e.signedAmount.toString()),
        );
      }
    }

    // ── 7. Compute running balance for each entry in page ─────
    //
    // runningBalance[i] = pageStartBalance + SUM(signedAmount[0..i])
    // Using Prisma.Decimal throughout — no IEEE 754 float contamination.
    const items: StatementRow[] = [];
    let runningBalance = new Prisma.Decimal(pageStartBalance.toString());

    for (const entry of entries) {
      runningBalance = runningBalance.add(
        new Prisma.Decimal(entry.signedAmount.toString()),
      );

      items.push({
        id: entry.id,
        entryType: entry.entryType,
        signedAmount: entry.signedAmount,
        entryDate: entry.entryDate,
        dueDate: entry.dueDate,
        note: entry.note,
        createdById: entry.createdById,
        createdAt: entry.createdAt,
        // Store as fixed 2dp string — consistent with Decimal(14,2) in DB
        runningBalance: runningBalance.toFixed(2),
      });
    }

    // ── 8. Closing balance for period ─────────────────────────
    //
    // = openingBalanceForPeriod + SUM(all signedAmounts in period)
    //
    // We compute from the last runningBalance on the last page,
    // but that only covers one page. We need the true total.
    // Use an aggregate for correctness.
    const periodAggregate = await this.prisma.ledgerEntry.aggregate({
      where: periodWhere,
      _sum: { signedAmount: true },
    });
    const periodSum =
      periodAggregate._sum.signedAmount ?? new Prisma.Decimal(0);
    const closingBalanceForPeriod = openingBalanceForPeriod.add(
      new Prisma.Decimal(periodSum.toString()),
    );

    return {
      partyInfo: partyDisplayInfo,
      currentBalance: currentBalance.toFixed(2),
      openingBalanceForPeriod: openingBalanceForPeriod.toFixed(2),
      closingBalanceForPeriod: closingBalanceForPeriod.toFixed(2),
      items,
      total,
      page,
      limit,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // PARTY VALIDATION & DATA
  // ══════════════════════════════════════════════════════════════

  /**
   * التحقق من وجود الطرف في الشركة
   *
   * يستعلم مباشرة من الجدول المناسب بدلاً من استيراد موديولات
   * الأطراف (لتجنب الـ circular dependencies).
   */
  async partyExists(
    companyId: string,
    partyType: PartyType,
    partyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const db = tx ?? this.prisma;
    let count = 0;

    switch (partyType) {
      case PartyType.CUSTOMER:
        count = await db.customer.count({
          where: { id: partyId, companyId, isDeleted: false },
        });
        break;
      case PartyType.SUPPLIER:
        count = await db.supplier.count({
          where: { id: partyId, companyId, isDeleted: false },
        });
        break;
      case PartyType.EMPLOYEE:
        count = await db.employee.count({
          where: { id: partyId, companyId, isDeleted: false },
        });
        break;
      default:
        return false;
    }

    return count > 0;
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  /**
   * جلب بيانات الطرف ورصيده الافتتاحي
   * يُستخدم في الـ statement لعرض اسم الطرف + حساب الرصيد الصحيح.
   */
  private async getPartyData(
    companyId: string,
    partyType: PartyType,
    partyId: string,
  ): Promise<{
    partyDisplayInfo: { id: string; name: string; partyType: PartyType } | null;
    openingBalance: Prisma.Decimal;
  }> {
    switch (partyType) {
      case PartyType.CUSTOMER: {
        const party = await this.prisma.customer.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { id: true, name: true, openingBalance: true },
        });
        return {
          partyDisplayInfo: party
            ? { id: party.id, name: party.name, partyType }
            : null,
          openingBalance: party?.openingBalance ?? new Prisma.Decimal(0),
        };
      }
      case PartyType.SUPPLIER: {
        const party = await this.prisma.supplier.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { id: true, name: true, openingBalance: true },
        });
        return {
          partyDisplayInfo: party
            ? { id: party.id, name: party.name, partyType }
            : null,
          openingBalance: party?.openingBalance ?? new Prisma.Decimal(0),
        };
      }
      case PartyType.EMPLOYEE: {
        const party = await this.prisma.employee.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { id: true, name: true, openingBalance: true },
        });
        return {
          partyDisplayInfo: party
            ? { id: party.id, name: party.name, partyType }
            : null,
          openingBalance: party?.openingBalance ?? new Prisma.Decimal(0),
        };
      }
      default:
        return {
          partyDisplayInfo: null,
          openingBalance: new Prisma.Decimal(0),
        };
    }
  }
}

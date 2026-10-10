import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma, ExpenseCategory } from '@prisma/client';
import { QueryExpenseDto } from './dto';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExpenseRecord {
  id: string;
  companyId: string;
  category: ExpenseCategory;
  amount: Prisma.Decimal;
  expenseDate: Date;
  description: string | null;
  referenceNumber: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdBy: { id: string; fullName: string | null };
}

export interface PaginatedExpenses {
  items: ExpenseRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ExpenseSummary {
  totalAmount: string;
  count: number;
  byCategory: { category: ExpenseCategory; total: string; count: number }[];
}

export interface CreateExpenseData {
  companyId: string;
  createdById: string;
  category: ExpenseCategory;
  amount: Prisma.Decimal;
  expenseDate: Date;
  description?: string;
  referenceNumber?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface UpdateExpenseData {
  category?: ExpenseCategory;
  amount?: Prisma.Decimal;
  expenseDate?: Date;
  description?: string;
  referenceNumber?: string;
  paymentMethod?: string;
  notes?: string;
}

// ── Select shape ───────────────────────────────────────────────────────────

const expenseSelect = {
  id: true,
  companyId: true,
  category: true,
  amount: true,
  expenseDate: true,
  description: true,
  referenceNumber: true,
  paymentMethod: true,
  notes: true,
  createdById: true,
  createdBy: { select: { id: true, fullName: true } },
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  deletedAt: true,
} satisfies Prisma.ExpenseSelect;

// ── Repository ─────────────────────────────────────────────────────────────

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── helpers ──────────────────────────────────────────────────────────────

  /** Runs a callback inside an existing transaction or a new one. */
  withTransaction<T>(
    tx: Prisma.TransactionClient | undefined,
    fn: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (tx) return fn(tx);
    return this.prisma.$transaction((t) => fn(t));
  }

  /** Build the shared WHERE clause used by list + summary queries. */
  private buildWhere(
    companyId: string,
    query: QueryExpenseDto,
  ): Prisma.ExpenseWhereInput {
    const where: Prisma.ExpenseWhereInput = {
      companyId,
      isDeleted: false,
    };

    if (query.category) where.category = query.category;

    if (query.dateFrom || query.dateTo) {
      where.expenseDate = {};
      if (query.dateFrom) where.expenseDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.expenseDate.lte = new Date(query.dateTo);
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async create(
    data: CreateExpenseData,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpenseRecord> {
    const db = tx ?? this.prisma;
    return db.expense.create({
      data: {
        companyId: data.companyId,
        createdById: data.createdById,
        category: data.category,
        amount: data.amount,
        expenseDate: data.expenseDate,
        description: data.description,
        referenceNumber: data.referenceNumber,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      },
      select: expenseSelect,
    }) as Promise<ExpenseRecord>;
  }

  async findMany(
    companyId: string,
    query: QueryExpenseDto,
  ): Promise<PaginatedExpenses> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(companyId, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: expenseSelect,
      }),
      this.prisma.expense.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items as ExpenseRecord[],
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    companyId: string,
  ): Promise<ExpenseRecord | null> {
    return this.prisma.expense.findFirst({
      where: { id, companyId, isDeleted: false },
      select: expenseSelect,
    }) as Promise<ExpenseRecord | null>;
  }

  async update(
    id: string,
    companyId: string,
    data: UpdateExpenseData,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpenseRecord> {
    const db = tx ?? this.prisma;
    // updateMany scopes by companyId — prevents cross-tenant updates
    await db.expense.updateMany({
      where: { id, companyId, isDeleted: false },
      data,
    });
    return db.expense.findFirstOrThrow({
      where: { id, companyId },
      select: expenseSelect,
    }) as Promise<ExpenseRecord>;
  }

  async softDelete(
    id: string,
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    await db.expense.updateMany({
      where: { id, companyId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async exists(id: string, companyId: string): Promise<boolean> {
    const count = await this.prisma.expense.count({
      where: { id, companyId, isDeleted: false },
    });
    return count > 0;
  }

  // ── Summary / Analytics ───────────────────────────────────────────────────

  // ── AuditLog ──────────────────────────────────────────────────────────────

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

  // ── Summary / Analytics ───────────────────────────────────────────────────

  async getSummary(
    companyId: string,
    query: QueryExpenseDto,
  ): Promise<ExpenseSummary> {
    const where = this.buildWhere(companyId, query);

    // Aggregate total and count
    const aggregate = await this.prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    // Group by category for breakdown
    const grouped = await this.prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    return {
      totalAmount: (aggregate._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      count: aggregate._count.id,
      byCategory: grouped.map((g) => ({
        category: g.category,
        total: (g._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        count: g._count.id,
      })),
    };
  }
}

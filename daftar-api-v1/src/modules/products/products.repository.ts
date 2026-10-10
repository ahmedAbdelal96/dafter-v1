// ============================================================
// ProductsRepository — Pure Data Access Layer
// ============================================================
//
// Design decisions:
// - All queries are company-scoped (multi-tenant isolation).
// - Soft-delete: isDeleted = false enforced in all read queries.
// - updateMany used for writes (enforces companyId in WHERE).
// - count + data fetched in parallel $transaction for efficiency.
// - withTransaction() helper allows callers to inject an existing
//   Prisma transaction client (for atomic use-case compositions).
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SalesInvoiceStatus, Prisma } from '@prisma/client';
import { QueryProductDto } from './dto';

// ── Return-shape interfaces ────────────────────────────────────────────────

export interface ProductWithCreator {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  unit: string | null;
  unitPrice: Prisma.Decimal;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy: { id: string; fullName: string | null };
}

export interface PaginatedProducts {
  items: ProductWithCreator[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateProductData {
  companyId: string;
  createdById: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  unit?: string;
  unitPrice: Prisma.Decimal;
  isActive?: boolean;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  sku?: string | null;
  category?: string | null;
  unit?: string | null;
  unitPrice?: Prisma.Decimal;
  isActive?: boolean;
}

// Lightweight shape for typeahead / quick-search responses
export interface ProductSearchResult {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  unitPrice: Prisma.Decimal;
  isActive: boolean;
}

export interface LastPriceResult {
  unitPrice: Prisma.Decimal;
  invoiceDate: Date;
  invoiceNumber: string;
}

// ── Select shapes ─────────────────────────────────────────────────────────
// Defined once, used by all read queries for a consistent response shape.

// Lightweight select for typeahead / search endpoints
const productSearchSelect = {
  id: true,
  name: true,
  sku: true,
  unit: true,
  unitPrice: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

const productSelect = {
  id: true,
  companyId: true,
  name: true,
  description: true,
  sku: true,
  category: true,
  unit: true,
  unitPrice: true,
  isActive: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.ProductSelect;

// ── Repository ────────────────────────────────────────────────────────────

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Transaction helper ────────────────────────────────────────────────

  /**
   * Runs `fn` inside an existing transaction client or opens a new one.
   * Allows use cases to compose atomic operations without nesting transactions.
   */
  withTransaction<T>(
    tx: Prisma.TransactionClient | undefined,
    fn: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (tx) return fn(tx);
    return this.prisma.$transaction((t) => fn(t));
  }

  // ── WHERE builder ─────────────────────────────────────────────────────

  /**
   * Shared WHERE clause for list queries.
   * Avoids code duplication between findMany and count queries.
   */
  private buildWhere(
    companyId: string,
    query: QueryProductDto,
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      companyId,
      isDeleted: false,
    };

    // isActive filter: undefined = return all (active + inactive)
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.search) {
      // Search across name, SKU, and description
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  // ── CREATE ────────────────────────────────────────────────────────────

  async create(
    data: CreateProductData,
    tx?: Prisma.TransactionClient,
  ): Promise<ProductWithCreator> {
    const db = tx ?? this.prisma;
    return db.product.create({
      data: {
        companyId: data.companyId,
        createdById: data.createdById,
        name: data.name,
        description: data.description,
        sku: data.sku,
        category: data.category,
        unit: data.unit,
        unitPrice: data.unitPrice,
        isActive: data.isActive ?? true,
      },
      select: productSelect,
    }) as Promise<ProductWithCreator>;
  }

  // ── READ — list ───────────────────────────────────────────────────────

  async findMany(
    companyId: string,
    query: QueryProductDto,
  ): Promise<PaginatedProducts> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(companyId, query);

    // Parallel count + data — single DB roundtrip
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: limit,
        select: productSelect,
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items as ProductWithCreator[],
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

  // ── READ — single ─────────────────────────────────────────────────────

  async findOne(
    id: string,
    companyId: string,
  ): Promise<ProductWithCreator | null> {
    return this.prisma.product.findFirst({
      where: { id, companyId, isDeleted: false },
      select: productSelect,
    }) as Promise<ProductWithCreator | null>;
  }

  // ── EXISTS — helpers ──────────────────────────────────────────────────

  async exists(id: string, companyId: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { id, companyId, isDeleted: false },
    });
    return count > 0;
  }

  /**
   * Check whether a SKU is already taken by another product in the same company.
   * `excludeId` allows the caller to exclude the current product during an update.
   */
  async skuExists(
    companyId: string,
    sku: string,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: {
        companyId,
        sku,
        isDeleted: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  // ── UPDATE ────────────────────────────────────────────────────────────

  async update(
    id: string,
    companyId: string,
    data: UpdateProductData,
    tx?: Prisma.TransactionClient,
  ): Promise<ProductWithCreator> {
    const db = tx ?? this.prisma;
    // updateMany enforces companyId in WHERE — prevents cross-tenant updates
    await db.product.updateMany({
      where: { id, companyId, isDeleted: false },
      data,
    });
    return db.product.findFirstOrThrow({
      where: { id, companyId },
      select: productSelect,
    }) as Promise<ProductWithCreator>;
  }

  // ── SOFT DELETE ───────────────────────────────────────────────────────

  async softDelete(
    id: string,
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    await db.product.updateMany({
      where: { id, companyId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ── SEARCH ────────────────────────────────────────────────────────────

  /**
   * Lightweight typeahead search — matches name or SKU (active products only).
   * Designed for debounced calls from invoice item pickers.
   */
  async search(
    companyId: string,
    q: string,
    limit: number,
  ): Promise<ProductSearchResult[]> {
    const results = await this.prisma.product.findMany({
      where: {
        companyId,
        isDeleted: false,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: productSearchSelect,
      orderBy: { name: 'asc' },
      take: limit,
    });
    return results as ProductSearchResult[];
  }

  // ── RECENT ────────────────────────────────────────────────────────────

  /**
   * Most recently used (distinct) products for the company,
   * derived from APPROVED invoice items — ordered by last usage date.
   */
  async getRecentProducts(
    companyId: string,
    limit: number,
  ): Promise<ProductSearchResult[]> {
    // Fetch more than needed to allow deduplication
    const rows = await this.prisma.salesInvoiceLine.findMany({
      where: {
        productId: { not: null },
        product: { isDeleted: false },
        salesInvoice: {
          companyId,
          status: SalesInvoiceStatus.POSTED,
        },
      },
      select: {
        productId: true,
        product: { select: productSearchSelect },
        salesInvoice: { select: { documentDate: true } },
      },
      orderBy: { salesInvoice: { documentDate: 'desc' } },
      take: limit * 5,
    });

    const seen = new Set<string>();
    const results: ProductSearchResult[] = [];
    for (const row of rows) {
      if (!row.productId || !row.product) continue;
      if (seen.has(row.productId)) continue;
      seen.add(row.productId);
      results.push(row.product as ProductSearchResult);
      if (results.length >= limit) break;
    }
    return results;
  }

  // ── LAST PRICE ────────────────────────────────────────────────────────

  /**
   * Last price this product was sold at to a specific BusinessPartner.
   */
  async getLastPrice(
    companyId: string,
    productId: string,
    businessPartnerId: string,
  ): Promise<LastPriceResult | null> {
    const row = await this.prisma.salesInvoiceLine.findFirst({
      where: {
        productId,
        salesInvoice: {
          companyId,
          status: SalesInvoiceStatus.POSTED,
          businessPartnerId,
        },
      },
      select: {
        unitPrice: true,
        salesInvoice: { select: { documentDate: true, invoiceNumber: true } },
      },
      orderBy: { salesInvoice: { documentDate: 'desc' } },
    });

    if (!row) return null;
    return {
      unitPrice: row.unitPrice,
      invoiceDate: row.salesInvoice.documentDate,
      invoiceNumber: row.salesInvoice.invoiceNumber,
    };
  }

  // ── AUDIT LOG ─────────────────────────────────────────────────────────

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
}

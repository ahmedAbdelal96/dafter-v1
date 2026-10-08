// ============================================================
// InvoicesRepository — Financial Data Access Layer
// ============================================================
//
// Design decisions:
//
// 1. INVOICE NUMBER GENERATION (INV-YYYY-NNNN):
//    - Counted within a DB transaction to prevent race conditions.
//    - A @@unique([companyId, invoiceNumber]) constraint in the schema
//      provides a DB-level safety net against any concurrent duplicates.
//
// 2. PARTY SNAPSHOT:
//    - Party name and phone are fetched at creation time and stored as
//      immutable snapshot fields on the invoice. Future party edits do
//      not affect existing invoices.
//
// 3. ITEM TOTALS:
//    - The use case recomputes total = quantity × unitPrice server-side
//      to guard against client-side manipulation.
//    - All Decimal values are constructed with new Prisma.Decimal(n) —
//      never JS float arithmetic.
//
// 4. ATOMIC WRITES:
//    - Invoice header + items + AuditLog created in one $transaction.
//    - withTransaction() helper composes safely with callers that may
//      already hold a transaction client.
//
// 5. SOFT DELETE:
//    - isDeleted/deletedAt pattern — no hard deletes.
//    - Deleting an invoice does NOT touch the linked DeferredSale.
//
// 6. TENANT ISOLATION:
//    - companyId present in every query, no exceptions.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma, PartyType, LedgerEntryType, SaleType, InvoiceStatus, InvoicePaymentStatus } from '@prisma/client';
import { InvoiceQueryDto } from './dto';

// ── Return-shape interfaces ────────────────────────────────────────────────────

export interface InvoiceItemSnapshot {
  id: string;
  productId: string | null;
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  total: Prisma.Decimal;
}

export interface InvoiceDetail {
  id: string;
  companyId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  deferredSaleId: string | null;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  partyPhone: string | null;
  partyAddress: string | null;
  totalAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  invoicePaymentStatus: InvoicePaymentStatus;
  notes: string | null;
  issueDate: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy: { id: string; fullName: string | null };
  items: InvoiceItemSnapshot[];
}

export interface InvoiceSummary {
  id: string;
  companyId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  deferredSaleId: string | null;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  partyPhone: string | null;
  totalAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  invoicePaymentStatus: InvoicePaymentStatus;
  issueDate: Date;
  createdAt: Date;
  createdById: string;
  createdBy: { id: string; fullName: string | null };
}

export interface PaginatedInvoices {
  items: InvoiceSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateInvoiceData {
  companyId: string;
  createdById: string;
  invoiceNumber: string;
  status?: InvoiceStatus;
  deferredSaleId?: string;
  ledgerEntryId?: string;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  partyPhone?: string | null;
  partyAddress?: string | null;
  totalAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  notes?: string | null;
  issueDate: Date;
  items: {
    productId?: string | null;
    description: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    total: Prisma.Decimal;
  }[];
}

// ── Shared SELECT shape ────────────────────────────────────────────────────────

/** Full detail shape (with items) — used by findOne */
const invoiceDetailSelect = {
  id: true,
  companyId: true,
  invoiceNumber: true,
  status: true,
  deferredSaleId: true,
  partyType: true,
  partyId: true,
  partyName: true,
  partyPhone: true,
  partyAddress: true,
  totalAmount: true,
  taxAmount: true,
  paidAmount: true,
  invoicePaymentStatus: true,
  notes: true,
  issueDate: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  createdBy: { select: { id: true, fullName: true } },
  items: {
    select: {
      id: true,
      productId: true,
      description: true,
      quantity: true,
      unitPrice: true,
      total: true,
    },
    orderBy: { id: 'asc' as const }, // preserve insertion order
  },
} satisfies Prisma.InvoiceSelect;

/** Summary shape (without items) — used by findMany */
const invoiceSummarySelect = {
  id: true,
  companyId: true,
  invoiceNumber: true,
  status: true,
  deferredSaleId: true,
  partyType: true,
  partyId: true,
  partyName: true,
  partyPhone: true,
  totalAmount: true,
  taxAmount: true,
  paidAmount: true,
  invoicePaymentStatus: true,
  issueDate: true,
  createdAt: true,
  createdById: true,
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.InvoiceSelect;

// ── Repository ─────────────────────────────────────────────────────────────────

@Injectable()
export class InvoicesRepository {
  private readonly logger = new Logger(InvoicesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Transaction helper ─────────────────────────────────────────────────────

  /**
   * Runs `fn` inside an existing transaction client, or opens a new one.
   * Prevents nested transactions — callers can safely compose operations.
   */
  withTransaction<T>(
    tx: Prisma.TransactionClient | undefined,
    fn: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (tx) return fn(tx);
    return this.prisma.$transaction(fn);
  }

  // ── Invoice number generation ──────────────────────────────────────────────

  /**
   * Generates the next INV-{YYYY}-{NNNN} sequence for this company and year.
   *
   * Must be called INSIDE a transaction so the COUNT + INSERT are atomic.
   * The @@unique([companyId, invoiceNumber]) DB constraint acts as a safety
   * net if two concurrent transactions somehow reach the same count.
   *
   * Example output: "INV-2026-0001", "INV-2026-0042"
   */
  async generateInvoiceNumber(
    companyId: string,
    year: number,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    // Find max trailing numeric sequence for this company + year,
    // including soft-deleted invoices.
    //
    // Supports both current format (INV-YYYY-NNNN) and legacy variants
    // such as INV-YYYY-ALP-NNNN by extracting the trailing digit group.
    // This avoids NaN fallback to 1 when legacy prefixes exist.
    const prefix = `INV-${year}-`;
    const [seqRow] = await tx.$queryRaw<{ maxSeq: number | null }[]>(
      Prisma.sql`
        SELECT COALESCE(
          MAX(
            CASE
              WHEN "invoiceNumber" ~ ${`^${prefix}.+[0-9]+$`}
                THEN (regexp_match("invoiceNumber", '([0-9]+)$'))[1]::int
              WHEN "invoiceNumber" ~ ${`^${prefix}[0-9]+$`}
                THEN (regexp_match("invoiceNumber", '([0-9]+)$'))[1]::int
              ELSE NULL
            END
          ),
          0
        ) AS "maxSeq"
        FROM "Invoice"
        WHERE "companyId" = ${companyId}
          AND "invoiceNumber" LIKE ${`${prefix}%`}
      `,
    );

    const nextSeq = (seqRow?.maxSeq ?? 0) + 1;

    const invoiceNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;

    this.logger.debug(
      `Generated invoice number: ${invoiceNumber} for company: ${companyId}`,
    );
    return invoiceNumber;
  }

  // ── Party helpers (avoid importing party modules → no circular deps) ───────

  /**
   * Returns name + phone of a party, or null if the party is not found.
   */
  async getPartySnapshot(
    companyId: string,
    partyType: PartyType,
    partyId: string,
  ): Promise<{ name: string; phone: string | null } | null> {
    switch (partyType) {
      case PartyType.CUSTOMER: {
        const p = await this.prisma.customer.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { name: true, phone: true },
        });
        return p ? { name: p.name, phone: p.phone ?? null } : null;
      }
      case PartyType.SUPPLIER: {
        const p = await this.prisma.supplier.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { name: true, phone: true },
        });
        return p ? { name: p.name, phone: p.phone ?? null } : null;
      }
      case PartyType.EMPLOYEE: {
        const p = await this.prisma.employee.findFirst({
          where: { id: partyId, companyId, isDeleted: false },
          select: { name: true, phone: true },
        });
        return p ? { name: p.name, phone: p.phone ?? null } : null;
      }
      default:
        return null;
    }
  }

  /**
   * Returns the customer's current live balance plus configured credit limit.
   * Approval uses this to enforce the ceiling when the invoice becomes financial.
   */
  async getCustomerCreditState(
    companyId: string,
    customerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ currentBalance: number; creditLimit: number | null } | null> {
    const db = tx ?? this.prisma;

    const [customer, balance] = await Promise.all([
      db.customer.findFirst({
        where: { id: customerId, companyId, isDeleted: false },
        select: { creditLimit: true },
      }),
      db.balance.findUnique({
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
      currentBalance: parseFloat(
        (balance?.balance ?? new Prisma.Decimal(0)).toString(),
      ),
      creditLimit:
        customer.creditLimit === null
          ? null
          : parseFloat(customer.creditLimit.toString()),
    };
  }

  /**
   * Returns true when a product belongs to this company and is not deleted.
   */
  async productBelongsToCompany(
    productId: string,
    companyId: string,
  ): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { id: productId, companyId, isDeleted: false },
    });
    return count > 0;
  }

  // ── Deferred-sale helpers ──────────────────────────────────────────────────

  /**
   * Fetches a deferred sale for the from-deferred-sale use case.
   * Returns null if not found or doesn't belong to this company.
   */
  async findDeferredSale(id: string, companyId: string) {
    return this.prisma.deferredSale.findFirst({
      where: { id, companyId, isDeleted: false },
      select: {
        id: true,
        partyType: true,
        partyId: true,
        referenceNumber: true,
        description: true,
        totalAmount: true,
      },
    });
  }

  /**
   * Returns true if this deferred sale already has an invoice linked to it.
   */
  async invoiceExistsForSale(
    deferredSaleId: string,
    companyId: string,
  ): Promise<boolean> {
    const count = await this.prisma.invoice.count({
      where: { deferredSaleId, companyId, isDeleted: false },
    });
    return count > 0;
  }

  // ── CREATE ─────────────────────────────────────────────────────────────────

  /**
   * Creates an Invoice + all InvoiceItems in a single atomic write.
   * Must be called inside a transaction that already holds the generated number.
   */
  async create(
    data: CreateInvoiceData,
    tx: Prisma.TransactionClient,
  ): Promise<InvoiceDetail> {
    return tx.invoice.create({
      data: {
        companyId: data.companyId,
        createdById: data.createdById,
        invoiceNumber: data.invoiceNumber,
        status: data.status ?? InvoiceStatus.DRAFT,
        deferredSaleId: data.deferredSaleId ?? null,
        ledgerEntryId: data.ledgerEntryId ?? null,
        partyType: data.partyType,
        partyId: data.partyId,
        partyName: data.partyName,
        partyPhone: data.partyPhone ?? null,
        partyAddress: data.partyAddress ?? null,
        totalAmount: data.totalAmount,
        taxAmount: data.taxAmount,
        notes: data.notes ?? null,
        issueDate: data.issueDate,
        items: {
          createMany: {
            data: data.items.map((item) => ({
              productId: item.productId ?? null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
      },
      select: invoiceDetailSelect,
    }) as Promise<InvoiceDetail>;
  }

  // ── READ — list ────────────────────────────────────────────────────────────

  /** Returns a paginated, filtered list of invoices (without item details). */
  async findMany(
    companyId: string,
    query: InvoiceQueryDto,
  ): Promise<PaginatedInvoices> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(companyId, query);

    // Parallel count + data — single DB round-trip via $transaction
    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: invoiceSummarySelect,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items as InvoiceSummary[],
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

  // ── READ — single ──────────────────────────────────────────────────────────

  /** Returns a full invoice with its line-items, or null. */
  async findOne(id: string, companyId: string): Promise<InvoiceDetail | null> {
    return this.prisma.invoice.findFirst({
      where: { id, companyId, isDeleted: false },
      select: invoiceDetailSelect,
    }) as Promise<InvoiceDetail | null>;
  }

  // ── UPDATE DRAFT ──────────────────────────────────────────────────────────

  /**
   * Replaces invoice header fields + all line-items for a DRAFT invoice.
   * Returns the updated invoice with new items.
   * The caller MUST supply a transaction client (tx).
   */
  async updateDraft(
    id: string,
    companyId: string,
    data: {
      items?: {
        productId?: string | null;
        description: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        total: Prisma.Decimal;
      }[];
      totalAmount?: Prisma.Decimal;
      taxAmount?: Prisma.Decimal;
      issueDate?: Date;
      notes?: string | null;
    },
    tx: Prisma.TransactionClient,
  ) {
    // If new items provided, delete existing and re-create
    if (data.items) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoiceItem.createMany({
        data: data.items.map((item) => ({
          invoiceId: id,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      });
    }

    const updated = await tx.invoice.update({
      where: { id, companyId },
      data: {
        ...(data.totalAmount !== undefined && { totalAmount: data.totalAmount }),
        ...(data.taxAmount !== undefined && { taxAmount: data.taxAmount }),
        ...(data.issueDate !== undefined && { issueDate: data.issueDate }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        items: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    return updated;
  }

  /**
   * Fetches items for diff computation — returns id, unitPrice, quantity for each item.
   */
  async findItemsForDiff(invoiceId: string) {
    return this.prisma.invoiceItem.findMany({
      where: { invoiceId },
      select: { id: true, description: true, unitPrice: true, quantity: true },
    });
  }

  // ── EXISTS ────────────────────────────────────────────────────────────────

  async exists(id: string, companyId: string): Promise<boolean> {
    const count = await this.prisma.invoice.count({
      where: { id, companyId, isDeleted: false },
    });
    return count > 0;
  }

  // ── SOFT DELETE ────────────────────────────────────────────────────────────

  /** Soft-deletes the invoice. Does NOT touch the linked DeferredSale. */
  async softDelete(
    id: string,
    companyId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.invoice.updateMany({
      where: { id, companyId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  /**
   * Fetches the fields needed by the delete use-case:
   * status, partyType, partyId, totalAmount, ledgerEntryId, deferredSaleId.
   * Returns null if not found or already deleted.
   */
  async findForDelete(
    id: string,
    companyId: string,
  ): Promise<{
    id: string;
    status: InvoiceStatus;
    partyType: PartyType;
    partyId: string;
    totalAmount: Prisma.Decimal;
    ledgerEntryId: string | null;
    deferredSaleId: string | null;
  } | null> {
    return this.prisma.invoice.findFirst({
      where: { id, companyId, isDeleted: false },
      select: {
        id: true,
        status: true,
        partyType: true,
        partyId: true,
        totalAmount: true,
        ledgerEntryId: true,
        deferredSaleId: true,
      },
    });
  }

  /**
   * Fetches the fields needed by approve/reject/cancel use-cases.
   * Returns null if not found or already deleted.
   */
  async findForAction(
    id: string,
    companyId: string,
  ): Promise<{
    id: string;
    status: InvoiceStatus;
    partyType: PartyType;
    partyId: string;
    totalAmount: Prisma.Decimal;
    ledgerEntryId: string | null;
    deferredSaleId: string | null;
  } | null> {
    return this.prisma.invoice.findFirst({
      where: { id, companyId, isDeleted: false },
      select: {
        id: true,
        status: true,
        partyType: true,
        partyId: true,
        totalAmount: true,
        ledgerEntryId: true,
        deferredSaleId: true,
      },
    });
  }

  /**
   * Updates invoice status and optionally sets the ledgerEntryId.
   * Always supply `tx` so this runs inside the caller's transaction.
   */
  async updateStatus(
    id: string,
    companyId: string,
    status: InvoiceStatus,
    tx: Prisma.TransactionClient,
    ledgerEntryId?: string,
  ): Promise<void> {
    await tx.invoice.update({
      where: { id, companyId },
      data: {
        status,
        ...(ledgerEntryId !== undefined ? { ledgerEntryId } : {}),
      },
    });
  }

  // ── LEDGER ENTRY ────────────────────────────────────────────────────────────

  /** Creates a LedgerEntry inside a transaction. */
  async createLedgerEntry(
    tx: Prisma.TransactionClient,
    data: {
      companyId: string;
      partyType: PartyType;
      partyId: string;
      entryType: LedgerEntryType;
      signedAmount: number;
      entryDate: Date;
      note?: string | null;
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
        saleType: SaleType.CASH,
        createdById: data.createdById,
        isDeleted: false,
      },
    });
  }

  /** Soft-deletes a LedgerEntry inside a transaction (used on invoice cancel). */
  async softDeleteLedgerEntry(
    tx: Prisma.TransactionClient,
    companyId: string,
    ledgerEntryId: string,
  ) {
    return tx.ledgerEntry.update({
      where: { id: ledgerEntryId, companyId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // ── BALANCE ─────────────────────────────────────────────────────────────────

  /** DB-level balance increment (upsert). */
  async incrementBalance(
    tx: Prisma.TransactionClient,
    companyId: string,
    partyType: PartyType,
    partyId: string,
    amount: number,
  ) {
    return tx.balance.upsert({
      where: { companyId_partyType_partyId: { companyId, partyType, partyId } },
      update: { balance: { increment: amount } },
      create: { companyId, partyType, partyId, balance: amount },
    });
  }

  /** DB-level balance decrement. */
  async decrementBalance(
    tx: Prisma.TransactionClient,
    companyId: string,
    partyType: PartyType,
    partyId: string,
    amount: number,
  ) {
    return tx.balance.update({
      where: { companyId_partyType_partyId: { companyId, partyType, partyId } },
      data: { balance: { decrement: amount } },
    });
  }

  // ── WHERE builder ──────────────────────────────────────────────────────────

  private buildWhere(
    companyId: string,
    query: InvoiceQueryDto,
  ): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      isDeleted: false,
    };

    if (query.status) where.status = query.status;
    if (query.partyType) where.partyType = query.partyType;
    if (query.partyId) where.partyId = query.partyId;

    if (query.dateFrom || query.dateTo) {
      where.issueDate = {};
      if (query.dateFrom) where.issueDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.issueDate.lte = new Date(query.dateTo);
    }

    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { partyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // B9.1 — paymentStatus filter
    if (query.paymentStatus) where.invoicePaymentStatus = query.paymentStatus;

    // B9.1 — deferredOnly: only show invoices linked to a deferred sale
    if (query.deferredOnly) {
      where.deferredSaleId = { not: null };
    }

    return where;
  }

  // ── DUPLICATE (B4) ────────────────────────────────────────────────────

  /**
   * Returns a full invoice with items — used by DuplicateInvoiceUseCase.
   * Re-uses invoiceDetailSelect so the clone has the same shape as a normal invoice.
   */
  async findForDuplicate(
    id: string,
    companyId: string,
  ): Promise<InvoiceDetail | null> {
    return this.prisma.invoice.findFirst({
      where: { id, companyId, isDeleted: false },
      select: invoiceDetailSelect,
    }) as Promise<InvoiceDetail | null>;
  }

  // ── LAST INVOICES FOR PARTY (B4) ──────────────────────────────────────

  /**
   * Returns the most recent invoices for a customer — used in the
   * "repeat last invoice" UX flow. Returns all non-deleted statuses so the
   * user can see their last real transactions.
   */
  async getLastInvoicesForParty(
    companyId: string,
    partyType: PartyType,
    partyId: string,
    limit: number,
  ): Promise<InvoiceSummary[]> {
    const items = await this.prisma.invoice.findMany({
      where: { companyId, isDeleted: false, partyType, partyId },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: invoiceSummarySelect,
    });
    return items as InvoiceSummary[];
  }

  // ── PAYMENT (B5) ──────────────────────────────────────────────────────

  /**
   * Fetches the fields needed to record a payment against an invoice:
   * status, partyType, partyId, totalAmount, paidAmount, invoicePaymentStatus.
   */
  async findForPayment(id: string, companyId: string) {
    return this.prisma.invoice.findFirst({
      where: { id, companyId, isDeleted: false },
      select: {
        id: true,
        status: true,
        partyType: true,
        partyId: true,
        totalAmount: true,
        paidAmount: true,
        invoicePaymentStatus: true,
      },
    });
  }

  /**
   * Atomically applies a payment amount to an invoice:
   *   - Increments paidAmount
   *   - Recomputes invoicePaymentStatus (PARTIAL | PAID)
   * Must be called inside a transaction.
   */
  async applyPayment(
    tx: Prisma.TransactionClient,
    id: string,
    companyId: string,
    paymentAmount: Prisma.Decimal,
    currentPaidAmount: Prisma.Decimal,
    totalAmount: Prisma.Decimal,
  ): Promise<void> {
    const newPaid = currentPaidAmount.add(paymentAmount);
    const newStatus = newPaid.greaterThanOrEqualTo(totalAmount)
      ? InvoicePaymentStatus.PAID
      : InvoicePaymentStatus.PARTIAL;

    await tx.invoice.update({
      where: { id, companyId },
      data: {
        paidAmount: { increment: paymentAmount },
        invoicePaymentStatus: newStatus,
      },
    });
  }

  /**
   * Returns all APPROVED, not-fully-paid invoices for a party,
   * ordered by issueDate ASC (oldest first — FIFO distribution).
   */
  async getOpenInvoicesForParty(
    companyId: string,
    partyType: PartyType,
    partyId: string,
  ) {
    return this.prisma.invoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        partyType,
        partyId,
        status: InvoiceStatus.APPROVED,
        invoicePaymentStatus: { not: InvoicePaymentStatus.PAID },
      },
      orderBy: { issueDate: 'asc' }, // oldest first (FIFO)
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        invoicePaymentStatus: true,
        issueDate: true,
      },
    });
  }

  // ── AUDIT LOG ─────────────────────────────────────────────────────────────

  async createAuditLog(
    tx: Prisma.TransactionClient,
    data: {
      companyId: string;
      actorUserId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, any>;
      diff?: Record<string, any>;
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
        ...(data.diff !== undefined && { diff: data.diff }),
      },
    });
  }
}

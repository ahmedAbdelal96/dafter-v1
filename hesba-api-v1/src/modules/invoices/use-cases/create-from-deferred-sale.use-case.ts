// ============================================================
// Use Case: Create Invoice from Deferred Sale (توليد فاتورة من بيع آجل)
// ============================================================
//
// Steps:
//   1. Load the DeferredSale (company-scoped, not deleted)
//   2. Check no invoice exists for this sale yet (idempotency guard)
//   3. Snapshot party name + phone from the live party record
//   4. Inside $transaction:
//      a. Generate invoice number
//      b. Build one InvoiceItem from the sale's description + totalAmount
//      c. Create Invoice + InvoiceItem linked to the sale (deferredSaleId)
//      d. AuditLog
//
// Design:
//   - The invoice is a snapshot: it captures the sale's totalAmount at the
//     moment of generation. Future payments or edits to the sale do NOT
//     change the invoice.
//   - Cancelling the invoice (soft-delete) does NOT affect the DeferredSale.
//   - A second call for the same saleId returns 409 (already invoiced).
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InvoicesRepository } from '../invoices.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class CreateFromDeferredSaleUseCase {
  private readonly logger = new Logger(CreateFromDeferredSaleUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * Generates an invoice from an existing deferred sale.
   *
   * @param companyId  - Tenant ID from JWT
   * @param userId     - Actor ID from JWT
   * @param saleId     - DeferredSale UUID (from URL param)
   * @returns          The full invoice with line-items
   *
   * @throws NotFoundException  - Sale not found
   * @throws ConflictException  - Invoice already exists for this sale
   */
  async execute(companyId: string, userId: string, saleId: string) {
    // ── Step 1: Load the DeferredSale ──────────────────────────────────────
    const sale = await this.repo.findDeferredSale(saleId, companyId);
    if (!sale) {
      throw new NotFoundException(this.t.translate('invoices.saleNotFound'));
    }

    // ── Step 2: Idempotency guard ──────────────────────────────────────────
    // Prevent generating a second invoice for the same sale.
    // The @@unique([deferredSaleId]) on Invoice provides a DB-level backstop,
    // but we check here first for a clean Arabic error message.
    const alreadyInvoiced = await this.repo.invoiceExistsForSale(
      saleId,
      companyId,
    );
    if (alreadyInvoiced) {
      throw new ConflictException(
        this.t.translate('invoices.saleAlreadyInvoiced'),
      );
    }

    // ── Step 3: Snapshot the party ─────────────────────────────────────────
    const partySnapshot = await this.repo.getPartySnapshot(
      companyId,
      sale.partyType,
      sale.partyId,
    );
    if (!partySnapshot) {
      // Party was deleted after the sale was created — use safe fallback name
      this.logger.warn(
        `Party ${sale.partyType}:${sale.partyId} not found when generating invoice ` +
          `for sale ${saleId} — using reference number as party name fallback`,
      );
    }

    // ── Step 4: Atomic transaction ─────────────────────────────────────────
    const invoice = await this.repo.withTransaction(undefined, async (tx) => {
      // Step 4a: Generate invoice number
      const year = new Date().getFullYear();
      const invoiceNumber = await this.repo.generateInvoiceNumber(
        companyId,
        year,
        tx,
      );

      // Step 4b: Build a single line-item from the sale
      // The item description uses the sale's description if available,
      // falling back to the reference number so the invoice is self-explanatory.
      const itemDescription =
        sale.description?.trim() || `بيع آجل — ${sale.referenceNumber}`;

      const saleTotal = new Prisma.Decimal(sale.totalAmount.toString());

      const items = [
        {
          productId: null, // free-text item — no catalog link
          description: itemDescription,
          quantity: new Prisma.Decimal(1),
          unitPrice: saleTotal,
          total: saleTotal,
        },
      ];

      // Step 4c: Create invoice
      const issueDate = new Date();
      issueDate.setUTCHours(0, 0, 0, 0);

      const created = await this.repo.create(
        {
          companyId,
          createdById: userId,
          invoiceNumber,
          deferredSaleId: sale.id,
          partyType: sale.partyType,
          partyId: sale.partyId,
          partyName: partySnapshot?.name ?? `${sale.partyType}:${sale.partyId}`,
          partyPhone: partySnapshot?.phone ?? null,
          partyAddress: null,
          totalAmount: saleTotal,
          taxAmount: new Prisma.Decimal(0),
          notes: null,
          issueDate,
          items,
        },
        tx,
      );

      // Step 4d: AuditLog
      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.create_from_deferred_sale',
        entityType: 'invoice',
        entityId: created.id,
        metadata: {
          invoiceNumber,
          deferredSaleId: saleId,
          saleReference: sale.referenceNumber,
          partyType: sale.partyType,
          partyId: sale.partyId,
          totalAmount: saleTotal.toFixed(2),
        },
      });

      this.logger.log(
        `Invoice generated from deferred sale: invoice=${created.id} | ` +
          `number=${invoiceNumber} | sale=${saleId} | actor=${userId}`,
      );

      return created;
    });

    return invoice;
  }
}

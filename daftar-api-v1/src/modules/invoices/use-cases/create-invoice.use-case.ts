// ============================================================
// Use Case: Create Invoice (إنشاء فاتورة مسودة)
// ============================================================
//
// Steps:
//   1. Validate party exists (company-scoped) → snapshot name + phone
//   2. Validate each productId (if provided) belongs to this company
//   3. Inside $transaction:
//      a. Generate invoice number (INV-YYYY-NNNN)
//      b. Compute item totals server-side (quantity × unitPrice)
//      c. Compute invoice totalAmount = SUM(items) + taxAmount
//      d. Create Invoice + InvoiceItems with status=DRAFT
//      e. AuditLog { action: 'invoice.create' }
//
// ⚠️  Financial effect (LedgerEntry + balance) is deferred until APPROVE.
//     A DRAFT invoice has zero financial impact.
//
// Security:
//   - partyId is validated against companyId — no cross-tenant lookup.
//   - productId (optional) is validated against companyId.
//   - totalAmount is server-computed — client value is ignored.
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InvoicesRepository } from '../invoices.repository';
import { CreateInvoiceDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import {
  computeDraftItems,
  normalizeIssueDateToUtcStart,
  sumItemTotals,
  validateDraftItemProducts,
} from './invoice-draft-preparation.util';

@Injectable()
export class CreateInvoiceUseCase {
  private readonly logger = new Logger(CreateInvoiceUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * Creates a new invoice as DRAFT — no financial effect at this stage.
   * Call approve-invoice to apply ledger entry + balance.
   *
   * @param companyId  - Tenant ID from JWT
   * @param userId     - Actor ID from JWT
   * @param dto        - Validated request body
   * @returns          The full invoice with line-items (status=DRAFT)
   *
   * @throws NotFoundException     - Party or product not found
   * @throws BadRequestException   - (reserved for future validations)
   * @throws ConflictException     - Concurrent duplicate invoice number (DB unique)
   */
  async execute(companyId: string, userId: string, dto: CreateInvoiceDto) {
    // ── Step 1: Validate party + snapshot ──────────────────────────────────
    const partySnapshot = await this.repo.getPartySnapshot(
      companyId,
      dto.partyType,
      dto.partyId,
    );
    if (!partySnapshot) {
      throw new NotFoundException(this.t.translate('invoices.partyNotFound'));
    }

    // ── Step 2: Validate all productIds (if any) ───────────────────────────
    await validateDraftItemProducts(dto.items, companyId, this.repo, this.t);

    // ── Step 3: Atomic transaction ─────────────────────────────────────────
    const invoice = await this.repo.withTransaction(undefined, async (tx) => {
      // Step 3a: Generate invoice number inside the transaction
      const year = new Date().getFullYear();
      const invoiceNumber = await this.repo.generateInvoiceNumber(
        companyId,
        year,
        tx,
      );

      // Step 3b: Compute item totals server-side (quantity × unitPrice)
      const computedItems = computeDraftItems(dto.items);

      // Step 3c: Compute invoice total = SUM(item totals) + taxAmount
      const itemsSubtotal = sumItemTotals(computedItems);
      const tax = new Prisma.Decimal(dto.taxAmount ?? 0);
      const totalAmount = itemsSubtotal.add(tax);

      const issueDate = normalizeIssueDateToUtcStart(dto.issueDate);

      // Step 3d: Persist invoice + items as DRAFT (no ledger, no balance yet)
      const created = await this.repo.create(
        {
          companyId,
          createdById: userId,
          invoiceNumber,
          // status defaults to DRAFT in repo.create()
          partyType: dto.partyType,
          partyId: dto.partyId,
          partyName: partySnapshot.name,
          partyPhone: partySnapshot.phone,
          partyAddress: dto.partyAddress ?? null,
          totalAmount,
          taxAmount: tax,
          notes: dto.notes ?? null,
          issueDate,
          items: computedItems,
        },
        tx,
      );

      // Step 3e: AuditLog
      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.create',
        entityType: 'invoice',
        entityId: created.id,
        metadata: {
          invoiceNumber,
          status: 'DRAFT',
          partyType: dto.partyType,
          partyId: dto.partyId,
          partyName: partySnapshot.name,
          totalAmount: totalAmount.toFixed(2),
          itemCount: computedItems.length,
        },
      });

      this.logger.log(
        `Invoice created (DRAFT): ${created.id} | number: ${invoiceNumber} | ` +
          `party: ${partySnapshot.name} | total: ${totalAmount.toFixed(2)} | actor: ${userId}`,
      );

      return created;
    });

    return invoice;
  }
}

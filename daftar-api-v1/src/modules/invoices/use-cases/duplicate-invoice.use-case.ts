// ============================================================
// Use Case: Duplicate Invoice (استنساخ فاتورة)
// ============================================================
//
// Clones any existing invoice as a new DRAFT:
//   - New invoice number (INV-YYYY-NNNN using today's year)
//   - issueDate = today (not copied from source)
//   - status  = DRAFT (always — never copies workflow state)
//   - Items   = copied as-is (snapshot values preserved)
//   - partyType/partyId/partyName/partyPhone/partyAddress = copied
//   - taxAmount / notes = copied
//
// NOT copied:
//   - deferredSaleId  — duplicate is a standalone invoice
//   - ledgerEntryId   — DRAFT has no financial effect
//   - paidAmount / invoicePaymentStatus — resets to UNPAID/0
//
// The source invoice may be in any status (APPROVED, CANCELLED, etc.)
// — duplicating a cancelled invoice is intentional (re-issue flow).
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { InvoicesRepository } from '../invoices.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class DuplicateInvoiceUseCase {
  private readonly logger = new Logger(DuplicateInvoiceUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @throws NotFoundException - Source invoice not found
   */
  async execute(companyId: string, userId: string, sourceId: string) {
    const source = await this.repo.findForDuplicate(sourceId, companyId);
    if (!source) {
      throw new NotFoundException(this.t.translate('invoices.notFound'));
    }

    const duplicate = await this.repo.withTransaction(undefined, async (tx) => {
      // Generate a fresh invoice number using today's year
      const year = new Date().getFullYear();
      const invoiceNumber = await this.repo.generateInvoiceNumber(
        companyId,
        year,
        tx,
      );

      // issueDate = today at midnight UTC (not copied from source)
      const issueDate = new Date();
      issueDate.setUTCHours(0, 0, 0, 0);

      const created = await this.repo.create(
        {
          companyId,
          createdById: userId,
          invoiceNumber,
          // status defaults to DRAFT in repo.create()
          // deferredSaleId intentionally omitted — standalone duplicate
          partyType: source.partyType,
          partyId: source.partyId,
          partyName: source.partyName,
          partyPhone: source.partyPhone,
          partyAddress: source.partyAddress,
          totalAmount: source.totalAmount,
          taxAmount: source.taxAmount,
          notes: source.notes,
          issueDate,
          items: source.items.map((item) => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
        tx,
      );

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.duplicate',
        entityType: 'invoice',
        entityId: created.id,
        metadata: {
          invoiceNumber,
          sourceInvoiceId: sourceId,
          sourceInvoiceNumber: source.invoiceNumber,
          status: InvoiceStatus.DRAFT,
          partyId: source.partyId,
          partyName: source.partyName,
          totalAmount: source.totalAmount.toFixed(2),
          itemCount: source.items.length,
        },
      });

      this.logger.log(
        `Invoice duplicated: ${created.id} (from ${sourceId}) | number: ${invoiceNumber} | actor: ${userId}`,
      );

      return created;
    });

    return duplicate;
  }
}

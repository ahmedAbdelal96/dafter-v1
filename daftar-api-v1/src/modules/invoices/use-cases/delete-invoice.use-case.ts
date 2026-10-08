// ============================================================
// Use Case: Delete Invoice (حذف فاتورة)
// ============================================================
//
// Business rules:
// - Only DRAFT and REJECTED invoices can be deleted.
//   These statuses have no financial effect — no ledger reversal needed.
// - APPROVED invoices must be CANCELLED (not deleted) to reverse the ledger.
//   Use cancel-invoice.use-case.ts for that.
// - Soft-delete only (isDeleted = true, deletedAt = now).
// - Cancelling an invoice does NOT affect the linked DeferredSale.
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { InvoicesRepository } from '../invoices.repository';
import { TranslationService } from '../../../common/services/translation.service';

const DELETABLE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.REJECTED,
];

@Injectable()
export class DeleteInvoiceUseCase {
  private readonly logger = new Logger(DeleteInvoiceUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * Soft-deletes a DRAFT or REJECTED invoice.
   * APPROVED invoices must be cancelled via PATCH /invoices/:id/cancel.
   *
   * @throws NotFoundException    - Invoice not found
   * @throws BadRequestException  - Invoice is not in a deletable status
   */
  async execute(companyId: string, userId: string, invoiceId: string) {
    const invoice = await this.repo.findForDelete(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundException(this.t.translate('invoices.notFound'));
    }

    if (!DELETABLE_STATUSES.includes(invoice.status)) {
      throw new BadRequestException(
        this.t.translate('invoices.cannotDeleteApproved'),
      );
    }

    await this.repo.withTransaction(undefined, async (tx) => {
      await this.repo.softDelete(invoiceId, companyId, tx);

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.delete',
        entityType: 'invoice',
        entityId: invoiceId,
        metadata: {
          invoiceId,
          status: invoice.status,
          totalAmount: invoice.totalAmount.toFixed(2),
        },
      });

      this.logger.log(
        `Invoice deleted: ${invoiceId} | status was: ${invoice.status} | actor: ${userId}`,
      );
    });
  }
}

// ============================================================
// Use Case: Cancel Invoice (إلغاء فاتورة معتمدة)
// ============================================================
//
// Transition: APPROVED → CANCELLED
// Financial effect:
//   - Manual invoice: soft-deletes LedgerEntry + decrements party balance
//   - From-deferred-sale invoice: status only (deferred-sales module owns the ledger)
//
// Only APPROVED invoices can be cancelled.
// DRAFT/REJECTED invoices should be deleted (see delete-invoice.use-case.ts).
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

@Injectable()
export class CancelInvoiceUseCase {
  private readonly logger = new Logger(CancelInvoiceUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * Cancels an APPROVED invoice and reverses its financial effect.
   *
   * @throws NotFoundException    - Invoice not found
   * @throws BadRequestException  - Invoice is not APPROVED
   */
  async execute(companyId: string, userId: string, invoiceId: string) {
    const invoice = await this.repo.findForAction(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundException(this.t.translate('invoices.notFound'));
    }

    if (invoice.status !== InvoiceStatus.APPROVED) {
      throw new BadRequestException(
        this.t.translate('invoices.cannotCancelStatus', {
          status: invoice.status,
        }),
      );
    }

    await this.repo.withTransaction(undefined, async (tx) => {
      // Reverse financial effect for manually-created approved invoices only.
      // DeferredSale-generated invoices: the deferred-sales module owns that ledger entry.
      if (invoice.ledgerEntryId && !invoice.deferredSaleId) {
        await this.repo.softDeleteLedgerEntry(
          tx,
          companyId,
          invoice.ledgerEntryId,
        );
        await this.repo.decrementBalance(
          tx,
          companyId,
          invoice.partyType,
          invoice.partyId,
          parseFloat(invoice.totalAmount.toFixed(2)),
        );
      }

      await this.repo.updateStatus(
        invoiceId,
        companyId,
        InvoiceStatus.CANCELLED,
        tx,
      );

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.cancel',
        entityType: 'invoice',
        entityId: invoiceId,
        metadata: {
          invoiceId,
          fromStatus: 'APPROVED',
          toStatus: 'CANCELLED',
          ledgerReversed: !!(invoice.ledgerEntryId && !invoice.deferredSaleId),
          totalAmount: invoice.totalAmount.toFixed(2),
        },
      });

      this.logger.log(
        `Invoice cancelled: ${invoiceId} | ledgerReversed: ${!!(invoice.ledgerEntryId && !invoice.deferredSaleId)} | actor: ${userId}`,
      );
    });
  }
}

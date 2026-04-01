// ============================================================
// Use Case: Reject Invoice (رفض الفاتورة)
// ============================================================
//
// Transition: DRAFT | PENDING_APPROVAL → REJECTED
// Financial effect: none
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

const REJECTABLE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.PENDING_APPROVAL,
];

@Injectable()
export class RejectInvoiceUseCase {
  private readonly logger = new Logger(RejectInvoiceUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * Rejects a DRAFT or PENDING_APPROVAL invoice.
   * No financial effect.
   *
   * @throws NotFoundException    - Invoice not found
   * @throws BadRequestException  - Invoice is not in a rejectable status
   */
  async execute(companyId: string, userId: string, invoiceId: string) {
    const invoice = await this.repo.findForAction(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundException(this.t.translate('invoices.notFound'));
    }

    if (!REJECTABLE_STATUSES.includes(invoice.status)) {
      throw new BadRequestException(
        this.t.translate('invoices.cannotRejectStatus', {
          status: invoice.status,
        }),
      );
    }

    await this.repo.withTransaction(undefined, async (tx) => {
      await this.repo.updateStatus(
        invoiceId,
        companyId,
        InvoiceStatus.REJECTED,
        tx,
      );

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.reject',
        entityType: 'invoice',
        entityId: invoiceId,
        metadata: { invoiceId, fromStatus: invoice.status, toStatus: 'REJECTED' },
      });

      this.logger.log(
        `Invoice rejected: ${invoiceId} | from: ${invoice.status} | actor: ${userId}`,
      );
    });
  }
}

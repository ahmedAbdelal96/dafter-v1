// ============================================================
// Use Case: Submit Invoice for Approval (إرسال الفاتورة للاعتماد)
// ============================================================
//
// Transition: DRAFT → PENDING_APPROVAL
// Financial effect: none
//
// Any user with manageLedger permission can submit a draft invoice.
// An owner/manager then approves or rejects it.
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
export class SubmitInvoiceUseCase {
  private readonly logger = new Logger(SubmitInvoiceUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * Transitions a DRAFT invoice to PENDING_APPROVAL.
   * No financial effect — ledger/balance unchanged.
   *
   * @throws NotFoundException    - Invoice not found
   * @throws BadRequestException  - Invoice is not in DRAFT status
   */
  async execute(companyId: string, userId: string, invoiceId: string) {
    const invoice = await this.repo.findForAction(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundException(this.t.translate('invoices.notFound'));
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        this.t.translate('invoices.cannotSubmitStatus', {
          status: invoice.status,
        }),
      );
    }

    await this.repo.withTransaction(undefined, async (tx) => {
      await this.repo.updateStatus(
        invoiceId,
        companyId,
        InvoiceStatus.PENDING_APPROVAL,
        tx,
      );

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.submit',
        entityType: 'invoice',
        entityId: invoiceId,
        metadata: { invoiceId, fromStatus: 'DRAFT', toStatus: 'PENDING_APPROVAL' },
      });

      this.logger.log(
        `Invoice submitted for approval: ${invoiceId} | actor: ${userId}`,
      );
    });
  }
}

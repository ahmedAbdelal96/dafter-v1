// ============================================================
// Use Case: Approve Invoice (اعتماد الفاتورة)
// ============================================================
//
// Transition: DRAFT | PENDING_APPROVAL → APPROVED
// Financial effect:
//   - Manual invoice: creates LedgerEntry + increments party balance
//   - From-deferred-sale invoice: status only (deferred-sales module owns the ledger)
//
// Only the invoice Owner or a user with 'approveInvoice' permission should
// call this endpoint (enforced at controller level).
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InvoiceStatus, LedgerEntryType, PartyType } from '@prisma/client';
import { InvoicesRepository } from '../invoices.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { GetCustomerSnapshotUseCase } from '../../customers/use-cases';

const APPROVABLE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.PENDING_APPROVAL,
];

@Injectable()
export class ApproveInvoiceUseCase {
  private readonly logger = new Logger(ApproveInvoiceUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
    private readonly customerSnapshot: GetCustomerSnapshotUseCase,
  ) {}

  /**
   * Approves an invoice and (for manual invoices) applies the financial effect.
   *
   * @throws NotFoundException    - Invoice not found
   * @throws BadRequestException  - Invoice is not in an approvable status
   */
  async execute(companyId: string, userId: string, invoiceId: string) {
    const invoice = await this.repo.findForAction(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundException(this.t.translate('invoices.notFound'));
    }

    if (!APPROVABLE_STATUSES.includes(invoice.status)) {
      throw new BadRequestException(
        this.t.translate('invoices.cannotApproveStatus', {
          status: invoice.status,
        }),
      );
    }

    await this.repo.withTransaction(undefined, async (tx) => {
      let ledgerEntryId: string | undefined;

      // Financial effect only for manually-created invoices.
      // DeferredSale-generated invoices already have ledger entries owned by that module.
      if (!invoice.deferredSaleId) {
        if (invoice.partyType === PartyType.CUSTOMER) {
          const creditState = await this.repo.getCustomerCreditState(
            companyId,
            invoice.partyId,
            tx,
          );

          if (!creditState) {
            throw new NotFoundException(this.t.translate('invoices.partyNotFound'));
          }

          if (
            creditState.creditLimit !== null &&
            creditState.currentBalance + Number(invoice.totalAmount) >
              creditState.creditLimit
          ) {
            throw new BadRequestException(
              this.t.translate('invoices.creditLimitExceeded', {
                balance: creditState.currentBalance.toFixed(2),
                total: Number(invoice.totalAmount).toFixed(2),
                limit: creditState.creditLimit.toFixed(2),
              }),
            );
          }
        }

        const ledgerEntry = await this.repo.createLedgerEntry(tx, {
          companyId,
          partyType: invoice.partyType,
          partyId: invoice.partyId,
          entryType: LedgerEntryType.INVOICE,
          signedAmount: parseFloat(invoice.totalAmount.toFixed(2)),
          entryDate: new Date(),
          note: invoiceId,
          createdById: userId,
        });
        ledgerEntryId = ledgerEntry.id;

        await this.repo.incrementBalance(
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
        InvoiceStatus.APPROVED,
        tx,
        ledgerEntryId,
      );

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.approve',
        entityType: 'invoice',
        entityId: invoiceId,
        metadata: {
          invoiceId,
          fromStatus: invoice.status,
          toStatus: 'APPROVED',
          ledgerEntryCreated: !!ledgerEntryId,
          totalAmount: invoice.totalAmount.toFixed(2),
        },
      });

      this.logger.log(
        `Invoice approved: ${invoiceId} | ledger: ${!!ledgerEntryId} | actor: ${userId}`,
      );
    });

    if (invoice.partyType === PartyType.CUSTOMER) {
      this.customerSnapshot.invalidate(companyId, invoice.partyId);
    }
  }
}

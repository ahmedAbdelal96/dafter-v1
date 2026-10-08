// ============================================================
// Use Case: Record Invoice Payment (تسجيل دفعة على فاتورة)
// ============================================================
//
// Records a payment against a specific APPROVED invoice:
//   1. Validates invoice exists and is APPROVED
//   2. Validates payment amount ≤ remaining (totalAmount - paidAmount)
//   3. Inside $transaction:
//      a. Increment invoice.paidAmount
//      b. Update invoice.invoicePaymentStatus → PARTIAL | PAID
//      c. Create PAYMENT LedgerEntry (decrements party balance)
//      d. Decrement party Balance
//      e. AuditLog
//
// Design:
//   - Prevents overpayment (amount > remaining) — BadRequestException
//   - Only APPROVED invoices can receive payments (other statuses → BadRequestException)
//   - LedgerEntry.signedAmount is negative (payment reduces the debt)
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, LedgerEntryType, Prisma, SaleType } from '@prisma/client';
import { InvoicesRepository } from '../invoices.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class RecordInvoicePaymentUseCase {
  private readonly logger = new Logger(RecordInvoicePaymentUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @throws NotFoundException    - Invoice not found
   * @throws BadRequestException  - Invoice not APPROVED, or overpayment
   */
  async execute(
    companyId: string,
    userId: string,
    invoiceId: string,
    amount: number,
    note?: string,
  ) {
    const invoice = await this.repo.findForPayment(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundException(this.t.translate('invoices.notFound'));
    }

    if (invoice.status !== InvoiceStatus.APPROVED) {
      throw new BadRequestException(
        this.t.translate('invoices.paymentNotApproved'),
      );
    }

    const paymentAmount = new Prisma.Decimal(amount);
    const remaining = invoice.totalAmount.sub(invoice.paidAmount);

    if (paymentAmount.greaterThan(remaining)) {
      throw new BadRequestException(
        this.t.translate('invoices.paymentExceedsRemaining', {
          remaining: remaining.toFixed(2),
        }),
      );
    }

    await this.repo.withTransaction(undefined, async (tx) => {
      // a+b. Update paidAmount + invoicePaymentStatus
      await this.repo.applyPayment(
        tx,
        invoiceId,
        companyId,
        paymentAmount,
        invoice.paidAmount,
        invoice.totalAmount,
      );

      // c. Create PAYMENT LedgerEntry (negative signedAmount — reduces debt)
      await tx.ledgerEntry.create({
        data: {
          companyId,
          partyType: invoice.partyType,
          partyId: invoice.partyId,
          entryType: LedgerEntryType.PAYMENT,
          signedAmount: -amount, // negative = reduces what party owes
          entryDate: new Date(),
          note: note ?? null,
          saleType: SaleType.CASH,
          createdById: userId,
          isDeleted: false,
        },
      });

      // d. Decrement party Balance
      await this.repo.decrementBalance(
        tx,
        companyId,
        invoice.partyType,
        invoice.partyId,
        amount,
      );

      // e. AuditLog
      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.payment',
        entityType: 'invoice',
        entityId: invoiceId,
        metadata: {
          invoiceId,
          amount: paymentAmount.toFixed(2),
          remaining: remaining.toFixed(2),
          newPaid: invoice.paidAmount.add(paymentAmount).toFixed(2),
          totalAmount: invoice.totalAmount.toFixed(2),
        },
      });

      this.logger.log(
        `Payment recorded: invoice ${invoiceId} | amount: ${amount} | actor: ${userId}`,
      );
    });
  }
}

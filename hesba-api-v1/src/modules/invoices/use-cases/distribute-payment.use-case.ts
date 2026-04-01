// ============================================================
// Use Case: Distribute Payment (توزيع دفعة على فواتير)
// ============================================================
//
// Distributes a lump-sum payment across multiple open invoices for a customer:
//
// Two modes:
//   1. Manual  — caller supplies invoiceIds[] to pay in that order
//   2. Auto FIFO — no invoiceIds supplied → pays oldest invoices first
//
// Transaction:
//   For each invoice (up to exhaustion of payment amount):
//     - Apply partial/full payment (applyPayment)
//   Then:
//     - Create ONE aggregate PAYMENT LedgerEntry
//     - Decrement party Balance by total amount
//     - AuditLog with breakdown
//
// Validations:
//   - Validates total amount ≤ total outstanding across targeted invoices
//   - Each targeted invoice must be APPROVED + belong to this company/customer
//   - Supplied invoiceIds must all belong to the given customerId
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LedgerEntryType, PartyType, Prisma, SaleType } from '@prisma/client';
import { InvoicesRepository } from '../invoices.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class DistributePaymentUseCase {
  private readonly logger = new Logger(DistributePaymentUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @throws NotFoundException    - No open invoices found
   * @throws BadRequestException  - Amount exceeds total outstanding, or invalid invoiceIds
   */
  async execute(
    companyId: string,
    userId: string,
    customerId: string,
    totalAmount: number,
    invoiceIds?: string[],
    note?: string,
  ) {
    // Load open invoices (APPROVED, not fully paid) for this customer
    let openInvoices = await this.repo.getOpenInvoicesForParty(
      companyId,
      PartyType.CUSTOMER,
      customerId,
    );

    if (openInvoices.length === 0) {
      throw new NotFoundException(
        this.t.translate('invoices.noOpenInvoices'),
      );
    }

    // Filter to requested invoiceIds if supplied (manual mode)
    if (invoiceIds && invoiceIds.length > 0) {
      const invoiceIdSet = new Set(invoiceIds);
      openInvoices = openInvoices.filter((inv) => invoiceIdSet.has(inv.id));

      if (openInvoices.length === 0) {
        throw new BadRequestException(
          this.t.translate('invoices.noMatchingOpenInvoices'),
        );
      }
    }

    // Validate: amount ≤ total outstanding
    const totalOutstanding = openInvoices.reduce(
      (sum, inv) => sum.add(inv.totalAmount.sub(inv.paidAmount)),
      new Prisma.Decimal(0),
    );
    const payment = new Prisma.Decimal(totalAmount);
    if (payment.greaterThan(totalOutstanding)) {
      throw new BadRequestException(
        this.t.translate('invoices.paymentExceedsTotal', {
          outstanding: totalOutstanding.toFixed(2),
        }),
      );
    }

    // Build distribution plan (FIFO)
    const distribution: Array<{
      invoiceId: string;
      invoiceNumber: string;
      amount: Prisma.Decimal;
      currentPaid: Prisma.Decimal;
      total: Prisma.Decimal;
    }> = [];

    let remaining = payment;
    for (const invoice of openInvoices) {
      if (remaining.isZero()) break;
      const invoiceRemaining = invoice.totalAmount.sub(invoice.paidAmount);
      const applied = remaining.lessThan(invoiceRemaining) ? remaining : invoiceRemaining;
      distribution.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: applied,
        currentPaid: invoice.paidAmount,
        total: invoice.totalAmount,
      });
      remaining = remaining.sub(applied);
    }

    await this.repo.withTransaction(undefined, async (tx) => {
      // Apply payment to each invoice
      for (const entry of distribution) {
        await this.repo.applyPayment(
          tx,
          entry.invoiceId,
          companyId,
          entry.amount,
          entry.currentPaid,
          entry.total,
        );
      }

      // One aggregate LedgerEntry for the full payment
      await tx.ledgerEntry.create({
        data: {
          companyId,
          partyType: PartyType.CUSTOMER,
          partyId: customerId,
          entryType: LedgerEntryType.PAYMENT,
          signedAmount: -totalAmount, // negative = reduces what customer owes
          entryDate: new Date(),
          note: note ?? null,
          saleType: SaleType.CASH,
          createdById: userId,
          isDeleted: false,
        },
      });

      // Decrement balance by total payment
      await this.repo.decrementBalance(
        tx,
        companyId,
        PartyType.CUSTOMER,
        customerId,
        totalAmount,
      );

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.distribute-payment',
        entityType: 'payment',
        entityId: customerId,
        metadata: {
          customerId,
          totalAmount: payment.toFixed(2),
          invoicesCount: distribution.length,
          breakdown: distribution.map((d) => ({
            invoiceId: d.invoiceId,
            invoiceNumber: d.invoiceNumber,
            applied: d.amount.toFixed(2),
          })),
        },
      });

      this.logger.log(
        `Payment distributed: customer ${customerId} | total: ${totalAmount} | ` +
          `invoices: ${distribution.length} | actor: ${userId}`,
      );
    });

    // Return the distribution breakdown for UI confirmation
    return {
      totalApplied: payment.toFixed(2),
      invoicesUpdated: distribution.length,
      breakdown: distribution.map((d) => ({
        invoiceId: d.invoiceId,
        invoiceNumber: d.invoiceNumber,
        applied: d.amount.toFixed(2),
      })),
    };
  }
}

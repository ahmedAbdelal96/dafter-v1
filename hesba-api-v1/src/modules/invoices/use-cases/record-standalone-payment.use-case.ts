// ============================================================
// Use Case: Record Standalone Payment (تسجيل دفعة مستقلة)
// ============================================================
//
// Records a payment from a party without tying it to a specific invoice.
// Useful when: "customer paid 500 — don't know which invoice yet"
//
// Effects:
//   - Creates PAYMENT LedgerEntry → decrements party Balance
//   - AuditLog
//
// No invoice paidAmount is touched — this is a general-purpose
// balance reduction (equivalent to a ledger PAYMENT entry).
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LedgerEntryType, SaleType } from '@prisma/client';
import { InvoicesRepository } from '../invoices.repository';
import { StandalonePaymentDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class RecordStandalonePaymentUseCase {
  private readonly logger = new Logger(RecordStandalonePaymentUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @throws NotFoundException - Party not found
   */
  async execute(companyId: string, userId: string, dto: StandalonePaymentDto) {
    // Verify the party exists
    const party = await this.repo.getPartySnapshot(
      companyId,
      dto.partyType,
      dto.partyId,
    );
    if (!party) {
      throw new NotFoundException(this.t.translate('invoices.partyNotFound'));
    }

    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    await this.repo.withTransaction(undefined, async (tx) => {
      // Create PAYMENT LedgerEntry
      await tx.ledgerEntry.create({
        data: {
          companyId,
          partyType: dto.partyType,
          partyId: dto.partyId,
          entryType: LedgerEntryType.PAYMENT,
          signedAmount: -dto.amount, // negative = reduces what party owes
          entryDate: paymentDate,
          note: dto.note ?? null,
          saleType: SaleType.CASH,
          createdById: userId,
          isDeleted: false,
        },
      });

      // Decrement Balance
      await this.repo.decrementBalance(
        tx,
        companyId,
        dto.partyType,
        dto.partyId,
        dto.amount,
      );

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'payment.standalone',
        entityType: 'payment',
        entityId: dto.partyId,
        metadata: {
          partyType: dto.partyType,
          partyId: dto.partyId,
          partyName: party.name,
          amount: dto.amount.toFixed(2),
          paymentDate: paymentDate.toISOString(),
        },
      });

      this.logger.log(
        `Standalone payment: party ${dto.partyId} | amount: ${dto.amount} | actor: ${userId}`,
      );
    });
  }
}

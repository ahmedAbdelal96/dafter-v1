// ============================================================
// Use Case: Cancel Installment Contract (إلغاء عقد التقسيط)
// ============================================================
//
// القيود:
//   - لا يمكن إلغاء عقود مكتملة (COMPLETED)
//   - يحتاج صلاحية OWNER فقط (مُطبَّق في Controller)
//
// الخطوات في $transaction واحدة:
//   1. جلب العقد (مع التحقق)
//   2. Soft-delete العقد (isDeleted=true, status=CANCELLED)
//   3. حساب المبلغ المتبقي = totalAmount - paidAmount - downPayment
//      (الجزء الذي لم يُسدَّد بعد)
//   4. إذا remaining > 0: Balance.decrement(remaining) لعكس الدين غير المسدَّد
//   5. Soft-delete الأقساط PENDING/PARTIAL (تحويلها لـ WAIVED)
//   6. Soft-delete LedgerEntry الأصلي (INVOICE)
//   7. AuditLog
//
// PRECISION:
//   remaining يُحسَب بـ Prisma.Decimal — لا حساب في JS.
//   Balance update = DB-level decrement فقط.
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, InstallmentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { InstallmentsRepository } from '../installments.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class CancelContractUseCase {
  private readonly logger = new Logger(CancelContractUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: InstallmentsRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * ينفّذ إلغاء عقد التقسيط مع عكس الآثار المالية.
   *
   * @param companyId - معرف الشركة (multi-tenant)
   * @param contractId - معرف العقد
   * @param actorUserId - معرف المستخدم المنفّذ (يجب أن يكون OWNER)
   * @throws NotFoundException إذا لم يوجد العقد
   * @throws BadRequestException إذا كان العقد مكتملاً
   */
  async execute(
    companyId: string,
    contractId: string,
    actorUserId: string,
  ): Promise<void> {
    // ── Pre-flight: fetch contract for validation ─────────────────────────
    const contract = await this.repo.findContractById(companyId, contractId, false);

    if (!contract) {
      throw new NotFoundException(
        this.t.translate('installments.cancel.notFound'),
      );
    }

    if (contract.status === InstallmentStatus.COMPLETED) {
      throw new BadRequestException(
        this.t.translate('installments.cancel.cannotCancelCompleted'),
      );
    }

    if (contract.status === InstallmentStatus.CANCELLED) {
      throw new BadRequestException(
        this.t.translate('installments.cancel.alreadyCancelled'),
      );
    }

    // ── $transaction: all writes atomic ──────────────────────────────────
    await this.prisma.$transaction(async (tx) => {
      // Step 1: Soft-delete the contract
      await this.repo.softDeleteContract(tx, companyId, contractId);

      // Step 2: Calculate the unpaid debt remaining
      //
      // remaining = totalAmount - paidAmount
      //   (paidAmount already includes downPayment since it was set to downPayment at creation)
      //   (every recorded payment increments paidAmount)
      //
      // This is the portion of the INVOICE that was never paid.
      // We reverse it from the balance.
      //
      // All arithmetic via Prisma.Decimal — no JS float.
      const totalAmountDec = new Prisma.Decimal(
        contract.totalAmount.toString(),
      );
      const paidAmountDec = new Prisma.Decimal(contract.paidAmount.toString());
      const downPaymentDec = new Prisma.Decimal(
        contract.downPayment.toString(),
      );

      // The original debt posted to balance was: totalAmount - downPayment
      // The amount already decremented from balance for payments: paidAmount - downPayment
      // Remaining balance impact to reverse: (totalAmount - downPayment) - (paidAmount - downPayment)
      //   = totalAmount - paidAmount
      const debtAmount = totalAmountDec.sub(downPaymentDec);
      const paidWithoutDown = paidAmountDec.sub(downPaymentDec);
      const remaining = debtAmount.sub(paidWithoutDown);

      if (remaining.gt(new Prisma.Decimal(0))) {
        // Reverse the unpaid portion from balance
        await this.repo.decrementBalance(
          tx,
          companyId,
          contract.partyType,
          contract.partyId,
          remaining,
        );
      }

      // Step 3: Soft-delete (WAIVE) all pending/partial schedules
      await this.repo.softDeletePendingSchedules(tx, companyId, contractId);

      // Step 4: Soft-delete original INVOICE LedgerEntry
      await this.repo.softDeleteLedgerEntry(
        tx,
        companyId,
        contract.ledgerEntryId,
      );

      // Step 5: Audit log
      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId,
        action: 'installment.contract.cancel',
        entityType: 'installment_contract',
        entityId: contractId,
        metadata: {
          contractNumber: contract.contractNumber,
          partyType: contract.partyType,
          partyId: contract.partyId,
          totalAmount: totalAmountDec.toFixed(2),
          paidAmount: paidAmountDec.toFixed(2),
          downPayment: downPaymentDec.toFixed(2),
          remainingReversed: remaining.gt(new Prisma.Decimal(0))
            ? remaining.toFixed(2)
            : '0.00',
        },
      });

      this.logger.log(
        `Contract ${contractId} (${contract.contractNumber}) CANCELLED by ${actorUserId} | reversed balance: ${remaining.toFixed(2)}`,
      );
    });
  }
}

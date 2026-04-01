// ============================================================
// Use Case: Record Installment Payment (تسجيل دفعة قسط)
// ============================================================
//
// الخطوات في $transaction واحدة:
//   1. التحقق من العقد (موجود، ACTIVE، غير محذوف)
//   2. التحقق من القسط (ينتمي للعقد، ليس PAID/WAIVED)
//   3. التحقق من صلاحية المبلغ (> 0، لا يتجاوز المتبقي)
//   4. إنشاء LedgerEntry (PAYMENT)
//   5. إنشاء InstallmentPayment
//   6. تحديث InstallmentSchedule: paidAmount += amount، تحديث status
//   7. تحديث InstallmentContract: paidAmount += amount، تحقق من COMPLETED
//   8. Balance.decrement(amount) — DB-level
//   9. AuditLog
//
// Schedule Status Logic:
//   paidAmount === amount → PAID (paidAt = now)
//   paidAmount < amount  → PARTIAL
//   دفعة جزئية على OVERDUE → تبقى PARTIAL حتى يكتمل السداد
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  InstallmentStatus,
  ScheduleStatus,
  LedgerEntryType,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { InstallmentsRepository } from '../installments.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { RecordInstallmentPaymentDto } from '../dto/record-installment-payment.dto';

@Injectable()
export class RecordInstallmentPaymentUseCase {
  private readonly logger = new Logger(RecordInstallmentPaymentUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: InstallmentsRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * ينفّذ تسجيل دفعة قسط بكل الآثار المالية المرتبطة.
   *
   * @param companyId - معرف الشركة (multi-tenant)
   * @param contractId - معرف العقد
   * @param actorUserId - معرف المستخدم المنفّذ
   * @param dto - بيانات الدفعة
   * @returns سجل الدفعة المنشأ مع معرف القسط المحدَّث
   * @throws NotFoundException إذا لم يوجد العقد أو القسط
   * @throws BadRequestException إذا كانت البيانات غير صالحة
   */
  async execute(
    companyId: string,
    contractId: string,
    actorUserId: string,
    dto: RecordInstallmentPaymentDto,
  ) {
    const amountDec = new Prisma.Decimal(dto.amount.toString());

    // ── Pre-transaction validations ───────────────────────────────────────

    // Fetch contract (outside tx for validation — read-only, no write needed yet)
    const contract = await this.repo.findContractById(
      companyId,
      contractId,
      false, // no schedules needed here
    );

    if (!contract) {
      throw new NotFoundException(
        this.t.translate('installments.payment.contractNotFound'),
      );
    }

    if (contract.status !== InstallmentStatus.ACTIVE) {
      throw new BadRequestException(
        this.t.translate('installments.payment.contractNotActive'),
      );
    }

    // Fetch schedule
    const schedule = await this.repo.findScheduleById(
      companyId,
      dto.scheduleId,
      contractId,
    );

    if (!schedule) {
      throw new NotFoundException(
        this.t.translate('installments.payment.scheduleNotFound'),
      );
    }

    if (
      schedule.status === ScheduleStatus.PAID ||
      schedule.status === ScheduleStatus.WAIVED
    ) {
      throw new BadRequestException(
        this.t.translate('installments.payment.scheduleAlreadyPaid'),
      );
    }

    // Validate amount > 0 (also enforced by DTO but double-checked here)
    if (amountDec.lte(new Prisma.Decimal(0))) {
      throw new BadRequestException(
        this.t.translate('installments.payment.amountMustBePositive'),
      );
    }

    // Validate amount ≤ remaining of schedule
    const schedulePaidDec = new Prisma.Decimal(schedule.paidAmount.toString());
    const scheduleAmountDec = new Prisma.Decimal(schedule.amount.toString());
    const remaining = scheduleAmountDec.sub(schedulePaidDec);

    if (amountDec.gt(remaining)) {
      throw new BadRequestException(
        this.t.translate('installments.payment.amountExceedsRemaining'),
      );
    }

    // ── $transaction: all writes atomic ──────────────────────────────────
    const payment = await this.prisma.$transaction(async (tx) => {
      const paymentDate = new Date(dto.paymentDate);
      paymentDate.setUTCHours(0, 0, 0, 0);

      // Step 1: Create PAYMENT LedgerEntry
      const ledgerEntry = await this.repo.createLedgerEntry(tx, {
        companyId,
        partyType: contract.partyType,
        partyId: contract.partyId,
        entryType: LedgerEntryType.PAYMENT,
        // Negative = payment received (reduces debt)
        signedAmount: amountDec.neg(),
        entryDate: paymentDate,
        note:
          dto.notes ??
          `دفعة قسط رقم ${schedule.installmentNumber} — عقد ${contract.contractNumber}`,
        createdById: actorUserId,
      });

      // Step 2: Create InstallmentPayment record
      const newPayment = await this.repo.createPayment(tx, {
        companyId,
        contractId,
        scheduleId: dto.scheduleId,
        ledgerEntryId: ledgerEntry.id,
        amount: amountDec,
        paymentDate,
        paymentMethod: dto.paymentMethod ?? null,
        notes: dto.notes ?? null,
        createdById: actorUserId,
      });

      // Step 3: Update InstallmentSchedule
      const newSchedulePaid = schedulePaidDec.add(amountDec);
      const isFullyPaid = newSchedulePaid.gte(scheduleAmountDec);
      const newScheduleStatus = isFullyPaid
        ? ScheduleStatus.PAID
        : ScheduleStatus.PARTIAL;

      await this.repo.updateSchedule(tx, dto.scheduleId, {
        paidAmount: { increment: amountDec },
        status: newScheduleStatus,
        ...(isFullyPaid && { paidAt: new Date() }),
      });

      // Step 4: Update InstallmentContract.paidAmount (DB-level increment)
      await this.repo.updateContract(tx, contractId, companyId, {
        paidAmount: { increment: amountDec },
      });

      // Step 5: Check if contract is now COMPLETED
      //   Contract is COMPLETED when all schedules are PAID or WAIVED.
      const unpaidCount = await this.repo.countUnpaidSchedules(tx, contractId);
      if (unpaidCount === 0) {
        await this.repo.updateContract(tx, contractId, companyId, {
          status: InstallmentStatus.COMPLETED,
        });
        this.logger.log(
          `Contract ${contractId} marked COMPLETED after full payment`,
        );
      }

      // Step 6: Balance.decrement(amount) — DB-level
      await this.repo.decrementBalance(
        tx,
        companyId,
        contract.partyType,
        contract.partyId,
        amountDec,
      );

      // Step 7: Audit log
      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId,
        action: 'installment.payment.record',
        entityType: 'installment_payment',
        entityId: newPayment.id,
        metadata: {
          contractId,
          contractNumber: contract.contractNumber,
          scheduleId: dto.scheduleId,
          installmentNumber: schedule.installmentNumber,
          amount: amountDec.toFixed(2),
          paymentDate: paymentDate.toISOString().split('T')[0],
          newScheduleStatus,
          contractCompleted: unpaidCount === 0,
        },
      });

      this.logger.log(
        `Payment recorded: ${newPayment.id} | contract: ${contractId} | schedule: ${dto.scheduleId} | amount: ${amountDec.toFixed(2)} | actor: ${actorUserId}`,
      );

      return newPayment;
    });

    return payment;
  }
}

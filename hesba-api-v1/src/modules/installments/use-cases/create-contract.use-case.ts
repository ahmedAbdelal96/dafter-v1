// ============================================================
// Use Case: Create Installment Contract (إنشاء عقد تقسيط)
// ============================================================
//
// الخطوات الكاملة في $transaction واحدة:
//   1. التحقق من وجود الطرف
//   2. توليد رقم العقد
//   3. إنشاء LedgerEntry (INVOICE) بمبلغ الدين
//   4. إنشاء InstallmentContract
//   5. إنشاء جدول الأقساط (FIXED أو CUSTOM)
//   6. إذا وُجدت دفعة مقدمة:
//      - إنشاء LedgerEntry (PAYMENT)
//      - تحديث Balance بـ (debtAmount - downPayment) DB-level
//   7. إذا لا دفعة مقدمة: increment(debtAmount)
//   8. AuditLog
//
// PRECISION:
//   كل الحسابات الجانبية (JS) تعتمد Prisma.Decimal.
//   Balance updates = DB-level increment/decrement فقط.
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ScheduleType, LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { InstallmentsRepository } from '../installments.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { CreateContractDto } from '../dto/create-contract.dto';

@Injectable()
export class CreateContractUseCase {
  private readonly logger = new Logger(CreateContractUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: InstallmentsRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * ينفّذ إنشاء عقد التقسيط بكل الخطوات المالية المرتبطة.
   *
   * @param companyId - معرف الشركة (multi-tenant)
   * @param actorUserId - معرف المستخدم المنفّذ
   * @param dto - بيانات إنشاء العقد
   * @returns العقد المنشأ مع أقساطه
   * @throws NotFoundException إذا لم يوجد الطرف
   * @throws BadRequestException إذا كانت البيانات غير متسقة
   */
  async execute(
    companyId: string,
    actorUserId: string,
    dto: CreateContractDto,
  ) {
    // ── Validation 1: Party must exist ───────────────────────────────────
    const partyFound = await this.repo.partyExists(
      companyId,
      dto.partyType,
      dto.partyId,
    );
    if (!partyFound) {
      throw new NotFoundException(
        this.t.translate('installments.create.partyNotFound'),
      );
    }

    // ── Validation 2: CUSTOM schedule validation ────────────────────────
    const totalAmountDec = new Prisma.Decimal(dto.totalAmount.toString());
    const downPaymentDec = new Prisma.Decimal((dto.downPayment ?? 0).toString());
    const debtAmount = totalAmountDec.sub(downPaymentDec);

    if (debtAmount.lte(new Prisma.Decimal(0))) {
      throw new BadRequestException(
        this.t.translate('installments.create.debtMustBePositive'),
      );
    }

    if (dto.scheduleType === ScheduleType.CUSTOM) {
      if (!dto.scheduleItems || dto.scheduleItems.length === 0) {
        throw new BadRequestException(
          this.t.translate('installments.create.customScheduleRequired'),
        );
      }

      if (dto.scheduleItems.length !== dto.numberOfInstallments) {
        throw new BadRequestException(
          this.t.translate('installments.create.scheduleCountMismatch'),
        );
      }

      // Validate sum of custom items ≈ debtAmount (within 0.01 tolerance)
      const itemsSum = dto.scheduleItems.reduce(
        (acc, item) => acc.add(new Prisma.Decimal(item.amount.toString())),
        new Prisma.Decimal(0),
      );

      const diff = itemsSum.sub(debtAmount).abs();
      if (diff.gt(new Prisma.Decimal('0.01'))) {
        throw new BadRequestException(
          this.t.translate('installments.create.scheduleAmountMismatch'),
        );
      }
    }

    // ── Step 1: Generate contract number ─────────────────────────────────
    const today = new Date();
    const year = today.getFullYear();
    const contractNumber = await this.repo.generateContractNumber(
      companyId,
      year,
    );

    // ── Steps 2–8: Everything inside ONE $transaction ────────────────────
    const contract = await this.prisma.$transaction(async (tx) => {
      const startDate = new Date(dto.startDate);
      startDate.setUTCHours(0, 0, 0, 0);

      // Step 2a: Create INVOICE LedgerEntry (debt to party)
      const invoiceEntry = await this.repo.createLedgerEntry(tx, {
        companyId,
        partyType: dto.partyType,
        partyId: dto.partyId,
        entryType: LedgerEntryType.INVOICE,
        // Positive = debt owed by party (standard installment convention)
        signedAmount: debtAmount,
        entryDate: today,
        note: dto.description ?? `عقد تقسيط رقم ${contractNumber}`,
        createdById: actorUserId,
      });

      // Step 2b: Create InstallmentContract
      const newContract = await this.repo.createContract(tx, {
        companyId,
        partyType: dto.partyType,
        partyId: dto.partyId,
        ledgerEntryId: invoiceEntry.id,
        contractNumber,
        description: dto.description ?? null,
        totalAmount: totalAmountDec,
        downPayment: downPaymentDec,
        // paidAmount starts as downPayment (already paid at signing)
        paidAmount: downPaymentDec,
        numberOfInstallments: dto.numberOfInstallments,
        scheduleType: dto.scheduleType,
        startDate,
        createdById: actorUserId,
      });

      // Step 2c: Create schedules
      const scheduleItems = this.buildScheduleItems(
        dto,
        debtAmount,
        startDate,
      );
      await this.repo.createSchedules(tx, companyId, newContract.id, scheduleItems);

      // Step 2d: Balance updates (DB-level only)
      if (downPaymentDec.gt(new Prisma.Decimal(0))) {
        // Has down payment: Create PAYMENT LedgerEntry for it
        await this.repo.createLedgerEntry(tx, {
          companyId,
          partyType: dto.partyType,
          partyId: dto.partyId,
          entryType: LedgerEntryType.PAYMENT,
          // Negative = received payment reducing the debt
          signedAmount: downPaymentDec.neg(),
          entryDate: today,
          note: `دفعة مقدمة لعقد ${contractNumber}`,
          createdById: actorUserId,
        });

        // Net balance effect = debtAmount - downPayment (remaining debt)
        const netDebt = debtAmount.sub(downPaymentDec);
        if (netDebt.gt(new Prisma.Decimal(0))) {
          await this.repo.incrementBalance(
            tx,
            companyId,
            dto.partyType,
            dto.partyId,
            netDebt,
          );
        }
        // If netDebt === 0 (full payment at signing), balance unchanged.
      } else {
        // No down payment: full debt amount goes to balance
        await this.repo.incrementBalance(
          tx,
          companyId,
          dto.partyType,
          dto.partyId,
          debtAmount,
        );
      }

      // Step 2e: Audit log
      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId,
        action: 'installment.contract.create',
        entityType: 'installment_contract',
        entityId: newContract.id,
        metadata: {
          contractNumber,
          partyType: dto.partyType,
          partyId: dto.partyId,
          totalAmount: totalAmountDec.toFixed(2),
          downPayment: downPaymentDec.toFixed(2),
          debtAmount: debtAmount.toFixed(2),
          numberOfInstallments: dto.numberOfInstallments,
          scheduleType: dto.scheduleType,
        },
      });

      this.logger.log(
        `Contract created: ${newContract.id} (${contractNumber}) | party: ${dto.partyType}/${dto.partyId} | debt: ${debtAmount.toFixed(2)} | actor: ${actorUserId}`,
      );

      return newContract.id;
    });

    // Return full contract with schedules (outside transaction)
    return this.repo.findContractById(companyId, contract);
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  /**
   * يبني قائمة الأقساط سواء FIXED أو CUSTOM.
   *
   * FIXED: يوزّع debtAmount على N أقساط بالتساوي مع Prisma.Decimal.
   *   - installmentAmount = debtAmount / N (مقرَّبة لـ 2 خانات عشرية)
   *   - آخر قسط = debtAmount - (installmentAmount × (N-1)) لتغطية فروق التقريب
   *
   * CUSTOM: يستخدم scheduleItems مباشرة.
   *
   * @param dto - DTO الإنشاء
   * @param debtAmount - المبلغ الإجمالي للأقساط
   * @param startDate - تاريخ أول قسط
   * @returns قائمة CreateScheduleItem
   */
  private buildScheduleItems(
    dto: CreateContractDto,
    debtAmount: Prisma.Decimal,
    startDate: Date,
  ) {
    const N = dto.numberOfInstallments;

    if (dto.scheduleType === ScheduleType.CUSTOM && dto.scheduleItems) {
      return dto.scheduleItems.map((item, idx) => {
        const dueDate = new Date(item.dueDate);
        dueDate.setUTCHours(0, 0, 0, 0);
        return {
          installmentNumber: idx + 1,
          dueDate,
          amount: new Prisma.Decimal(item.amount.toString()),
          notes: item.notes ?? null,
        };
      });
    }

    // FIXED: equal installments with remainder on last
    //
    // Using Prisma.Decimal for all arithmetic — no JS float contamination.
    // toDecimalPlaces(2) rounds to 2dp using ROUND_HALF_UP.
    const installmentAmount = debtAmount
      .div(new Prisma.Decimal(N))
      .toDecimalPlaces(2);

    // Last installment absorbs rounding remainder:
    //   lastAmount = debtAmount - installmentAmount × (N - 1)
    const sumOfFirst = installmentAmount.mul(new Prisma.Decimal(N - 1));
    const lastAmount = debtAmount.sub(sumOfFirst);

    // Explicit type prevents TypeScript from inferring never[] on the empty array.
    const items: Array<{
      installmentNumber: number;
      dueDate: Date;
      amount: Prisma.Decimal;
      notes: null;
    }> = [];

    for (let i = 0; i < N; i++) {
      // dueDate = startDate + i months
      const dueDate = new Date(startDate);
      dueDate.setUTCMonth(dueDate.getUTCMonth() + i);

      items.push({
        installmentNumber: i + 1,
        dueDate,
        amount: i === N - 1 ? lastAmount : installmentAmount,
        notes: null,
      });
    }

    return items;
  }
}

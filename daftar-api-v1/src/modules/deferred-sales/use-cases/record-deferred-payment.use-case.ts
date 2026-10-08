// ============================================================
// Use Case: Record Deferred Payment (تسجيل دفعة على بيع آجل)
// ============================================================
// القواعد التجارية:
//   - البيع الآجل يجب أن يكون موجوداً وغير محذوف وبنفس الشركة
//   - الحالة يجب أن لا تكون PAID — رمي BadRequestException
//   - مبلغ الدفعة يجب أن يكون > 0
//   - مبلغ الدفعة يجب أن لا يتجاوز المتبقي (totalAmount - paidAmount)
//
// في $transaction واحد:
//   a. إنشاء LedgerEntry { entryType: PAYMENT, signedAmount: -(amount) }
//   b. إنشاء DeferredPayment
//   c. تحديث paidAmount (DB increment) + status + version
//   d. Balance.decrement بمبلغ الدفعة
//   e. AuditLog { action: 'deferred-sale.payment' }
//
// تحديد الحالة الجديدة:
//   - if newPaidAmount >= totalAmount → PAID
//   - else if dueDate < today → OVERDUE
//   - else → PARTIAL
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DeferredSaleStatus, LedgerEntryType, SaleType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { DeferredSalesRepository } from '../deferred-sales.repository';
import { RecordDeferredPaymentDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class RecordDeferredPaymentUseCase {
  private readonly logger = new Logger(RecordDeferredPaymentUseCase.name);

  constructor(
    private readonly repo: DeferredSalesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * تسجيل دفعة جزئية أو كاملة على بيع آجل
   *
   * يتحقق من حالة البيع، يحسب المتبقي، ثم ينفّذ العملية الكاملة
   * (LedgerEntry + DeferredPayment + تحديث paidAmount + Balance + AuditLog)
   * داخل $transaction واحد.
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param userId - معرف المستخدم الذي ينفّذ العملية
   * @param saleId - معرف البيع الآجل
   * @param dto - بيانات الدفعة
   * @returns الدفعة المسجّلة مع البيع الآجل المحدَّث
   * @throws NotFoundException إذا كان البيع الآجل غير موجود
   * @throws BadRequestException إذا كان البيع مدفوعاً كاملاً أو المبلغ يتجاوز المتبقي
   */
  async execute(
    companyId: string,
    userId: string,
    saleId: string,
    dto: RecordDeferredPaymentDto,
  ) {
    // ── Step 1: Fetch and validate the deferred sale ─────────────
    const sale = await this.repo.findById(companyId, saleId);

    if (!sale) {
      throw new NotFoundException(
        this.t.translate('deferred-sales.payment.notFound'),
      );
    }

    // ── Step 2: Check status — cannot pay if already PAID ───────
    if (sale.status === DeferredSaleStatus.PAID) {
      throw new BadRequestException(
        this.t.translate('deferred-sales.payment.alreadyPaid'),
      );
    }

    // ── Step 3: Validate payment amount using Prisma.Decimal ─────
    // We use Prisma.Decimal for the comparison to avoid float precision issues.
    // Balance arithmetic itself is done at DB level (increment/decrement).
    const totalAmountDecimal = new Prisma.Decimal(sale.totalAmount.toString());
    const paidAmountDecimal = new Prisma.Decimal(sale.paidAmount.toString());
    const paymentAmountDecimal = new Prisma.Decimal(dto.amount.toString());
    const remainingDecimal = totalAmountDecimal.sub(paidAmountDecimal);

    if (paymentAmountDecimal.greaterThan(remainingDecimal)) {
      throw new BadRequestException(
        this.t.translate('deferred-sales.payment.amountExceedsRemaining'),
      );
    }

    // ── Step 4: Parse payment date ───────────────────────────────
    const paymentDate = new Date(dto.paymentDate);
    paymentDate.setUTCHours(0, 0, 0, 0);

    // ── Step 5: Determine new status ─────────────────────────────
    // We compute newPaidAmount using Decimal for status decision only.
    // The actual DB update uses increment (not this JS value).
    const newPaidAmountDecimal = paidAmountDecimal.add(paymentAmountDecimal);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let newStatus: DeferredSaleStatus;
    if (newPaidAmountDecimal.greaterThanOrEqualTo(totalAmountDecimal)) {
      newStatus = DeferredSaleStatus.PAID;
    } else if (sale.dueDate < today) {
      newStatus = DeferredSaleStatus.OVERDUE;
    } else {
      newStatus = DeferredSaleStatus.PARTIAL;
    }

    // ── Step 6: Execute atomic transaction ───────────────────────
    const result = await this.repo.withTransaction(async (tx) => {
      // Step 6a: Create LedgerEntry (PAYMENT) — signedAmount is negative (reduces debt)
      const ledgerEntry = await this.repo.createLedgerEntry(tx, {
        companyId,
        partyType: sale.partyType,
        partyId: sale.partyId,
        entryType: LedgerEntryType.PAYMENT,
        signedAmount: -dto.amount, // Negative: reduces the party's debt
        entryDate: paymentDate,
        dueDate: null,
        note: dto.notes ?? null,
        saleType: SaleType.DEFERRED,
        createdById: userId,
      });

      // Step 6b: Create DeferredPayment record
      const payment = await this.repo.createPayment(tx, {
        companyId,
        deferredSaleId: sale.id,
        ledgerEntryId: ledgerEntry.id,
        amount: dto.amount,
        paymentDate,
        paymentMethod: dto.paymentMethod ?? null,
        notes: dto.notes ?? null,
        createdById: userId,
      });

      // Step 6c: Update DeferredSale — DB-level increment for paidAmount
      const updatedSale = await this.repo.updateStatus(tx, sale.id, companyId, {
        status: newStatus,
        paymentAmount: dto.amount,
      });

      // Step 6d: Decrement balance — DB-level arithmetic (no JS floats)
      await this.repo.decrementBalance(
        tx,
        companyId,
        sale.partyType,
        sale.partyId,
        dto.amount,
      );

      // Step 6e: AuditLog
      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'deferred-sale.payment',
        entityType: 'deferred_payment',
        entityId: payment.id,
        metadata: {
          deferredSaleId: sale.id,
          referenceNumber: sale.referenceNumber,
          paymentAmount: dto.amount.toString(),
          newStatus,
          newPaidAmount: newPaidAmountDecimal.toFixed(2),
          remaining: remainingDecimal.sub(paymentAmountDecimal).toFixed(2),
          ledgerEntryId: ledgerEntry.id,
        },
      });

      this.logger.log(
        `DeferredPayment recorded: ${payment.id} | sale: ${sale.id} | ` +
          `amount: ${dto.amount} | newStatus: ${newStatus} | actor: ${userId}`,
      );

      return { payment, sale: updatedSale };
    });

    return result;
  }
}

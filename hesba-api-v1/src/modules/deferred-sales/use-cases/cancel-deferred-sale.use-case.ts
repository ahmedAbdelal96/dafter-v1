// ============================================================
// Use Case: Cancel Deferred Sale (إلغاء بيع آجل)
// ============================================================
// القواعد التجارية:
//   - صلاحية الإلغاء للمالك فقط (OwnerOnly في الكنترولر)
//   - لا يمكن إلغاء بيع مدفوع كاملاً (status === PAID)
//
// في $transaction واحد:
//   a. Soft-delete DeferredSale (isDeleted=true)
//   b. عكس الرصيد المتبقي: إذا paidAmount < totalAmount
//      → balance.decrement بـ (totalAmount - paidAmount)
//   c. Soft-delete حركة INVOICE المرتبطة (LedgerEntry)
//   d. AuditLog { action: 'deferred-sale.cancel' }
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DeferredSaleStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { DeferredSalesRepository } from '../deferred-sales.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class CancelDeferredSaleUseCase {
  private readonly logger = new Logger(CancelDeferredSaleUseCase.name);

  constructor(
    private readonly repo: DeferredSalesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * إلغاء بيع آجل وعكس الرصيد المتبقي
   *
   * يُغلق البيع الآجل بحذف ناعم، ويعكس الرصيد المتبقي فقط
   * (لأن الدفعات المسجّلة مسبقاً قد خفّضت الرصيد بالفعل).
   * كذلك يُلغي الحركة المالية INVOICE المرتبطة.
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param userId - معرف المستخدم الذي ينفّذ الإلغاء
   * @param saleId - معرف البيع الآجل
   * @throws NotFoundException إذا كان البيع الآجل غير موجود
   * @throws BadRequestException إذا كان البيع مدفوعاً كاملاً
   */
  async execute(
    companyId: string,
    userId: string,
    saleId: string,
  ): Promise<void> {
    // ── Step 1: Fetch and validate the deferred sale ─────────────
    const sale = await this.repo.findById(companyId, saleId);

    if (!sale) {
      throw new NotFoundException(
        this.t.translate('deferred-sales.cancel.notFound'),
      );
    }

    // ── Step 2: Cannot cancel a fully paid sale ──────────────────
    if (sale.status === DeferredSaleStatus.PAID) {
      throw new BadRequestException(
        this.t.translate('deferred-sales.cancel.alreadyPaid'),
      );
    }

    // ── Step 3: Compute remaining balance using Prisma.Decimal ───
    // (for balance reversal — only the unpaid portion is reversed)
    const totalAmountDecimal = new Prisma.Decimal(sale.totalAmount.toString());
    const paidAmountDecimal = new Prisma.Decimal(sale.paidAmount.toString());
    const remainingDecimal = totalAmountDecimal.sub(paidAmountDecimal);
    const hasRemaining = remainingDecimal.greaterThan(new Prisma.Decimal(0));

    // ── Step 4: Execute atomic transaction ───────────────────────
    await this.repo.withTransaction(async (tx) => {
      // Step 4a: Soft-delete DeferredSale
      await this.repo.softDelete(tx, companyId, saleId);

      // Step 4b: Reverse only the remaining (unpaid) balance
      // Paid amount has already been decremented via payment transactions.
      // We only reverse what was never paid.
      if (hasRemaining) {
        await this.repo.decrementBalance(
          tx,
          companyId,
          sale.partyType,
          sale.partyId,
          // Convert Decimal to number for the decrement call.
          // The actual DB operation uses SQL DECIMAL arithmetic — exact.
          Number(remainingDecimal.toFixed(2)),
        );
      }

      // Step 4c: Soft-delete the original INVOICE LedgerEntry
      await this.repo.softDeleteLedgerEntry(tx, companyId, sale.ledgerEntryId);

      // Step 4d: AuditLog
      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'deferred-sale.cancel',
        entityType: 'deferred_sale',
        entityId: saleId,
        metadata: {
          referenceNumber: sale.referenceNumber,
          partyType: sale.partyType,
          partyId: sale.partyId,
          totalAmount: sale.totalAmount.toString(),
          paidAmount: sale.paidAmount.toString(),
          remainingReversed: hasRemaining ? remainingDecimal.toFixed(2) : '0.00',
          previousStatus: sale.status,
          ledgerEntryId: sale.ledgerEntryId,
        },
      });

      this.logger.log(
        `DeferredSale cancelled: ${saleId} | ref: ${sale.referenceNumber} | ` +
          `remaining reversed: ${remainingDecimal.toFixed(2)} | actor: ${userId}`,
      );
    });
  }
}

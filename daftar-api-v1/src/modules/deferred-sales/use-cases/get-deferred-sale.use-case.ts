// ============================================================
// Use Case: Get Deferred Sale (جلب بيع آجل بمعرفه)
// ============================================================
// يجلب البيع الآجل مع:
//   - قائمة الدفعات المرتبطة
//   - اسم الطرف (العميل / المورد / الموظف)
//   - المبلغ المتبقي (حسابي — عرض فقط، لا تخزين)
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DeferredSalesRepository } from '../deferred-sales.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetDeferredSaleUseCase {
  private readonly logger = new Logger(GetDeferredSaleUseCase.name);

  constructor(
    private readonly repo: DeferredSalesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * جلب بيع آجل بمعرفه مع الدفعات واسم الطرف
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param saleId - معرف البيع الآجل (UUID)
   * @returns البيع الآجل مع الدفعات واسم الطرف والمبلغ المتبقي
   * @throws NotFoundException إذا كان البيع الآجل غير موجود
   */
  async execute(companyId: string, saleId: string) {
    // ── Step 1: Fetch with payments ──────────────────────────────
    const sale = await this.repo.findById(companyId, saleId, true);

    if (!sale) {
      throw new NotFoundException(
        this.t.translate('deferred-sales.get.notFound'),
      );
    }

    // ── Step 2: Fetch party name ──────────────────────────────────
    const partyName = await this.repo.getPartyName(
      companyId,
      sale.partyType,
      sale.partyId,
    );

    // ── Step 3: Compute remaining using Prisma.Decimal (display only) ──
    // This is purely for display purposes — balance arithmetic is at DB level.
    const totalAmountDecimal = new Prisma.Decimal(sale.totalAmount.toString());
    const paidAmountDecimal = new Prisma.Decimal(sale.paidAmount.toString());
    const remainingDecimal = totalAmountDecimal.sub(paidAmountDecimal);

    this.logger.debug(
      `GetDeferredSale: ${saleId} | party: ${sale.partyType}/${sale.partyId} | ` +
        `total: ${sale.totalAmount} | paid: ${sale.paidAmount} | ` +
        `remaining: ${remainingDecimal.toFixed(2)}`,
    );

    return {
      ...sale,
      partyName: partyName ?? null,
      remaining: remainingDecimal.toFixed(2),
    };
  }
}

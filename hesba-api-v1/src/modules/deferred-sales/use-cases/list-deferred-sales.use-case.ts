// ============================================================
// Use Case: List Deferred Sales (قائمة البيوع الآجلة)
// ============================================================
// يجلب قائمة مُصفَّحة من البيوع الآجلة مع دعم التصفية:
//   - partyType, partyId: تصفية بالطرف
//   - status: تصفية بالحالة
//   - dateFrom, dateTo: تصفية بتاريخ الاستحقاق
//   - search: بحث نصي في referenceNumber وdescription
//   - pagination: الصفحات
//
// يضيف المبلغ المتبقي لكل عنصر (عرض فقط — Prisma.Decimal)
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DeferredSalesRepository } from '../deferred-sales.repository';
import { QueryDeferredSaleDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class ListDeferredSalesUseCase {
  private readonly logger = new Logger(ListDeferredSalesUseCase.name);

  constructor(
    private readonly repo: DeferredSalesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * جلب قائمة مُصفَّحة من البيوع الآجلة مع تصفية متعددة الأبعاد
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param query - معاملات التصفية والصفحات
   * @returns قائمة مُصفَّحة مع العدد الكلي والمبلغ المتبقي لكل عنصر
   */
  async execute(companyId: string, query: QueryDeferredSaleDto) {
    // ── Step 1: Parse date filters ───────────────────────────────
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    if (query.dateFrom) {
      dateFrom = new Date(query.dateFrom);
      dateFrom.setUTCHours(0, 0, 0, 0);
    }

    if (query.dateTo) {
      dateTo = new Date(query.dateTo);
      dateTo.setUTCHours(0, 0, 0, 0);
    }

    // ── Step 2: Fetch paginated list ─────────────────────────────
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const result = await this.repo.findMany(companyId, {
      partyType: query.partyType,
      partyId: query.partyId,
      status: query.status,
      dateFrom,
      dateTo,
      search: query.search,
      page,
      limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    // ── Step 3: Enrich each item with remaining amount (display only) ──
    // Uses Prisma.Decimal for exact arithmetic — no IEEE 754 float errors.
    const enrichedItems = result.items.map((sale) => {
      const totalAmountDecimal = new Prisma.Decimal(sale.totalAmount.toString());
      const paidAmountDecimal = new Prisma.Decimal(sale.paidAmount.toString());
      const remainingDecimal = totalAmountDecimal.sub(paidAmountDecimal);

      return {
        ...sale,
        remaining: remainingDecimal.toFixed(2),
      };
    });

    this.logger.debug(
      `ListDeferredSales: company=${companyId} | total=${result.total} | ` +
        `page=${page}/${Math.ceil(result.total / limit)}`,
    );

    return {
      items: enrichedItems,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}

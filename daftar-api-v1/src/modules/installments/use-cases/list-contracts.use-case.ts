// ============================================================
// Use Case: List Contracts (قائمة عقود التقسيط)
// ============================================================
//
// يجلب قائمة مُجمَّعة مع:
//   - فلاتر: partyType, partyId, status, scheduleStatus, dateFrom, dateTo, search
//   - Pagination
//   - اختصار جدول الأقساط (بدون الدفعات لأداء أفضل)
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { InstallmentsRepository } from '../installments.repository';
import { QueryContractsDto } from '../dto/query-contracts.dto';

@Injectable()
export class ListContractsUseCase {
  private readonly logger = new Logger(ListContractsUseCase.name);

  constructor(private readonly repo: InstallmentsRepository) {}

  /**
   * يجلب قائمة عقود التقسيط مع pagination وفلاتر متعددة.
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param query - معاملات الاستعلام والفلاتر
   * @returns قائمة مُجمَّعة مع meta (total, page, limit, totalPages)
   */
  async execute(companyId: string, query: QueryContractsDto) {
    this.logger.debug(
      `ListContracts | company: ${companyId} | filters: ${JSON.stringify(query)}`,
    );

    return this.repo.findContracts(companyId, query);
  }
}

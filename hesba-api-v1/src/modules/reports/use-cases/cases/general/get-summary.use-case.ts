// ============================================
// Get Summary Use Case
// ============================================
// جلب ملخص مالي شامل لتقارير الشركة
//
// Returns:
//   - totalReceivables: مجموع الأرصدة الدائنة
//   - deferredSales: إحصاءات البيع الآجل
//   - installments: إحصاءات عقود التقسيط
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryReportsDto } from '../../../dto/query-reports.dto';

@Injectable()
export class GetSummaryUseCase {
  private readonly logger = new Logger(GetSummaryUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @param companyId - Company tenant identifier
   * @param query     - Optional filters: partyType, dateFrom, dateTo
   */
  async execute(companyId: string, query: QueryReportsDto) {
    this.logger.log(
      `GetSummary: companyId=${companyId} | filters=${JSON.stringify({
        partyType: query.partyType,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })}`,
    );

    const summary = await this.repo.getSummary(companyId, {
      partyType: query.partyType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    return summary;
  }
}

// ============================================
// Get Overdue Use Case
// ============================================
// جلب تقرير المتأخرين — بيوعات آجلة + أقساط متأخرة
//
// Returns paginated list of:
//   - Overdue deferred sales (sorted by daysOverdue DESC)
//   - Overdue installment schedules (sorted by daysOverdue DESC)
//
// Filter: partyType?, partyId?, minDaysOverdue? (default 1)
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryReportsDto } from '../../../dto/query-reports.dto';

@Injectable()
export class GetOverdueUseCase {
  private readonly logger = new Logger(GetOverdueUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @param companyId - Company tenant identifier
   * @param query     - Filters: partyType?, partyId?, minDaysOverdue?, page, limit
   */
  async execute(companyId: string, query: QueryReportsDto) {
    this.logger.log(
      `GetOverdue: companyId=${companyId} | minDaysOverdue=${query.minDaysOverdue ?? 1} | page=${query.page ?? 1}`,
    );

    // Ensure defaults
    const params: QueryReportsDto = {
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      minDaysOverdue: query.minDaysOverdue ?? 1,
    };

    const result = await this.repo.getOverdue(companyId, params);

    return result;
  }
}

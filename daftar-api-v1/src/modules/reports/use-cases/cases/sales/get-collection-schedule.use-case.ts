// ============================================
// Get Collection Schedule Use Case
// ============================================
// جلب جدول التحصيل — مدفوعات متوقعة في نطاق تاريخي
//
// Returns paginated, merged list of upcoming:
//   - PENDING/PARTIAL DeferredSales  (type: "DEFERRED")
//   - PENDING/PARTIAL InstallmentSchedules (type: "INSTALLMENT")
//
// Sorted by dueDate ASC.
// dateFrom and dateTo are REQUIRED (validated at DTO level).
// ============================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryCollectionDto } from '../../../dto/query-collection.dto';

@Injectable()
export class GetCollectionScheduleUseCase {
  private readonly logger = new Logger(GetCollectionScheduleUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @param companyId - Company tenant identifier
   * @param query     - dateFrom (required), dateTo (required), partyType?, partyId?, page, limit
   * @throws BadRequestException if dateFrom > dateTo
   */
  async execute(companyId: string, query: QueryCollectionDto) {
    this.logger.log(
      `GetCollectionSchedule: companyId=${companyId} | dateFrom=${query.dateFrom} | dateTo=${query.dateTo}`,
    );

    // Validate date range
    const from = new Date(query.dateFrom);
    const to = new Date(query.dateTo);

    if (from > to) {
      throw new BadRequestException(
        this.t.translate('reports.collectionSchedule.invalidDateRange'),
      );
    }

    const params: QueryCollectionDto = {
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    };

    const result = await this.repo.getCollectionSchedule(companyId, params);

    return result;
  }
}

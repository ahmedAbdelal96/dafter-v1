// ============================================================
// Use Case: Get Schedule (جدول الأقساط المستحقة)
// ============================================================
//
// يجلب الأقساط المستحقة خلال نطاق زمني محدد.
// الاستخدام النموذجي: "الأقساط المستحقة هذا الشهر"
//
// Filters:
//   - dateFrom: مطلوب
//   - dateTo: مطلوب
//   - status: افتراضي PENDING, PARTIAL, OVERDUE
// ============================================================

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InstallmentsRepository } from '../installments.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { QueryScheduleDto } from '../dto/query-schedule.dto';

@Injectable()
export class GetScheduleUseCase {
  private readonly logger = new Logger(GetScheduleUseCase.name);

  constructor(
    private readonly repo: InstallmentsRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * يجلب الأقساط المستحقة خلال نطاق تاريخي محدد.
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param query - معاملات الاستعلام (dateFrom, dateTo, status, page, limit)
   * @returns قائمة مُجمَّعة مع meta
   * @throws BadRequestException إذا كان dateFrom بعد dateTo
   */
  async execute(companyId: string, query: QueryScheduleDto) {
    // Validate date range
    const from = new Date(query.dateFrom);
    const to = new Date(query.dateTo);

    if (from > to) {
      throw new BadRequestException(
        this.t.translate('installments.schedule.invalidDateRange'),
      );
    }

    this.logger.debug(
      `GetSchedule | company: ${companyId} | from: ${query.dateFrom} | to: ${query.dateTo}`,
    );

    return this.repo.getUpcomingSchedule(companyId, query);
  }
}

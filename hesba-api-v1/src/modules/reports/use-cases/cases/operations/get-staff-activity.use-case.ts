import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryStaffActivityDto } from '../../../dto/query-staff-activity.dto';
import { endOfDay, startOfDay } from '../../shared/date';

@Injectable()
export class GetStaffActivityUseCase {
  private readonly logger = new Logger(GetStaffActivityUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, query: QueryStaffActivityDto) {
    const today = startOfDay(new Date());
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const from = query.dateFrom
      ? startOfDay(new Date(query.dateFrom))
      : startOfDay(firstDayOfMonth);
    const to = query.dateTo ? endOfDay(new Date(query.dateTo)) : endOfDay(today);

    if (from > to) {
      throw new BadRequestException(
        this.t.translate('reports.staffActivity.invalidDateRange'),
      );
    }

    this.logger.log(
      `GetStaffActivity: companyId=${companyId} | from=${from.toISOString()} | to=${to.toISOString()}`,
    );

    return this.repo.getStaffActivity(companyId, {
      dateFrom: from,
      dateTo: to,
      userId: query.userId,
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortBy: query.sortBy ?? 'activitiesCount',
      sortOrder: query.sortOrder ?? 'desc',
    });
  }
}


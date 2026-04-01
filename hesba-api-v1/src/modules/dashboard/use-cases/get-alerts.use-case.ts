import { Injectable } from '@nestjs/common';
import { TranslationService } from '../../../common/services/translation.service';
import { QueryDashboardAlertsDto } from '../dto/query-dashboard.dto';
import { DashboardRepository } from '../dashboard.repository';
import { resolveDashboardDateRange } from './shared/dashboard-date';

@Injectable()
export class GetDashboardAlertsUseCase {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly t: TranslationService,
  ) {}

  execute(companyId: string, query: QueryDashboardAlertsDto) {
    const range = resolveDashboardDateRange(query, this.t);

    return this.repo.getAlerts({
      companyId,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      limit: query.limit ?? 10,
    });
  }
}

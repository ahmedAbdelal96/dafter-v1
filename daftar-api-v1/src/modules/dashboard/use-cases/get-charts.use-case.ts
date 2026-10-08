import { Injectable } from '@nestjs/common';
import { TranslationService } from '../../../common/services/translation.service';
import { QueryDashboardChartsDto } from '../dto/query-dashboard.dto';
import { DashboardRepository } from '../dashboard.repository';
import {
  resolveChartGranularity,
  resolveDashboardDateRange,
} from './shared/dashboard-date';

@Injectable()
export class GetDashboardChartsUseCase {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly t: TranslationService,
  ) {}

  execute(companyId: string, query: QueryDashboardChartsDto) {
    const range = resolveDashboardDateRange(query, this.t);
    const granularity = resolveChartGranularity(range, query.granularity);

    return this.repo.getCharts({
      companyId,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      granularity,
    });
  }
}

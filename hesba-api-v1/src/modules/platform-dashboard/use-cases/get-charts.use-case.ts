import { Injectable } from '@nestjs/common';
import { TranslationService } from '../../../common/services/translation.service';
import { PlatformDashboardRepository } from '../platform-dashboard.repository';
import { QueryPlatformDashboardChartsDto } from '../dto/query-platform-dashboard.dto';
import {
  resolvePlatformChartGranularity,
  resolvePlatformDashboardDateRange,
} from './shared/platform-dashboard-date';

@Injectable()
export class GetPlatformDashboardChartsUseCase {
  constructor(
    private readonly repo: PlatformDashboardRepository,
    private readonly t: TranslationService,
  ) {}

  execute(query: QueryPlatformDashboardChartsDto) {
    const range = resolvePlatformDashboardDateRange(query, this.t);
    const granularity = resolvePlatformChartGranularity(range, query.granularity);

    return this.repo.getCharts({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      preset: range.preset,
      granularity,
    });
  }
}

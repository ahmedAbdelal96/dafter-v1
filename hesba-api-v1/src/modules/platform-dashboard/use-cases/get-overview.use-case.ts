import { Injectable } from '@nestjs/common';
import { TranslationService } from '../../../common/services/translation.service';
import { PlatformDashboardRepository } from '../platform-dashboard.repository';
import { QueryPlatformDashboardDto } from '../dto/query-platform-dashboard.dto';
import { resolvePlatformDashboardDateRange } from './shared/platform-dashboard-date';

@Injectable()
export class GetPlatformDashboardOverviewUseCase {
  constructor(
    private readonly repo: PlatformDashboardRepository,
    private readonly t: TranslationService,
  ) {}

  execute(query: QueryPlatformDashboardDto) {
    const range = resolvePlatformDashboardDateRange(query, this.t);

    return this.repo.getOverview({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      preset: range.preset,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { TranslationService } from '../../../common/services/translation.service';
import { PlatformDashboardRepository } from '../platform-dashboard.repository';
import { QueryPlatformDashboardHealthDto } from '../dto/query-platform-dashboard.dto';
import { resolvePlatformDashboardDateRange } from './shared/platform-dashboard-date';

@Injectable()
export class GetPlatformDashboardHealthUseCase {
  constructor(
    private readonly repo: PlatformDashboardRepository,
    private readonly t: TranslationService,
  ) {}

  execute(query: QueryPlatformDashboardHealthDto) {
    const range = resolvePlatformDashboardDateRange(query, this.t);

    return this.repo.getHealth({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      preset: range.preset,
      limit: query.limit ?? 6,
    });
  }
}

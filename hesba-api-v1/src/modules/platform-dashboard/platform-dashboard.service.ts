import { Injectable } from '@nestjs/common';
import {
  GetPlatformDashboardChartsUseCase,
  GetPlatformDashboardHealthUseCase,
  GetPlatformDashboardOverviewUseCase,
} from './use-cases';
import {
  QueryPlatformDashboardChartsDto,
  QueryPlatformDashboardDto,
  QueryPlatformDashboardHealthDto,
} from './dto/query-platform-dashboard.dto';

@Injectable()
export class PlatformDashboardService {
  constructor(
    private readonly getOverviewUseCase: GetPlatformDashboardOverviewUseCase,
    private readonly getChartsUseCase: GetPlatformDashboardChartsUseCase,
    private readonly getHealthUseCase: GetPlatformDashboardHealthUseCase,
  ) {}

  getOverview(query: QueryPlatformDashboardDto) {
    return this.getOverviewUseCase.execute(query);
  }

  getCharts(query: QueryPlatformDashboardChartsDto) {
    return this.getChartsUseCase.execute(query);
  }

  getHealth(query: QueryPlatformDashboardHealthDto) {
    return this.getHealthUseCase.execute(query);
  }
}

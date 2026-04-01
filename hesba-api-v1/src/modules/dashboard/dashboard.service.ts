import { Injectable } from '@nestjs/common';
import {
  GetDashboardAlertsUseCase,
  GetDashboardChartsUseCase,
  GetDashboardHighlightsUseCase,
  GetDashboardOverviewUseCase,
  GetReceivablesUseCase,
} from './use-cases';
import {
  QueryDashboardAlertsDto,
  QueryDashboardChartsDto,
  QueryDashboardDto,
  QueryDashboardHighlightsDto,
} from './dto/query-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly getOverviewUseCase: GetDashboardOverviewUseCase,
    private readonly getChartsUseCase: GetDashboardChartsUseCase,
    private readonly getHighlightsUseCase: GetDashboardHighlightsUseCase,
    private readonly getAlertsUseCase: GetDashboardAlertsUseCase,
    private readonly getReceivablesUseCase: GetReceivablesUseCase,
  ) {}

  getOverview(companyId: string, query: QueryDashboardDto) {
    return this.getOverviewUseCase.execute(companyId, query);
  }

  getCharts(companyId: string, query: QueryDashboardChartsDto) {
    return this.getChartsUseCase.execute(companyId, query);
  }

  getHighlights(companyId: string, query: QueryDashboardHighlightsDto) {
    return this.getHighlightsUseCase.execute(companyId, query);
  }

  getAlerts(companyId: string, query: QueryDashboardAlertsDto) {
    return this.getAlertsUseCase.execute(companyId, query);
  }

  getReceivables(companyId: string) {
    return this.getReceivablesUseCase.execute(companyId);
  }
}

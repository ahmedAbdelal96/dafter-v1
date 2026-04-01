import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';
import {
  GetDashboardAlertsUseCase,
  GetDashboardChartsUseCase,
  GetDashboardHighlightsUseCase,
  GetDashboardOverviewUseCase,
  GetReceivablesUseCase,
} from './use-cases';

@Module({
  controllers: [DashboardController],
  providers: [
    DashboardService,
    DashboardRepository,
    GetDashboardOverviewUseCase,
    GetDashboardChartsUseCase,
    GetDashboardHighlightsUseCase,
    GetDashboardAlertsUseCase,
    GetReceivablesUseCase,
  ],
})
export class DashboardModule {}

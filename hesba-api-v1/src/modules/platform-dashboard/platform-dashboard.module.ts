import { Module } from '@nestjs/common';
import { PlatformDashboardController } from './platform-dashboard.controller';
import { PlatformDashboardService } from './platform-dashboard.service';
import { PlatformDashboardRepository } from './platform-dashboard.repository';
import {
  GetPlatformDashboardChartsUseCase,
  GetPlatformDashboardHealthUseCase,
  GetPlatformDashboardOverviewUseCase,
} from './use-cases';

@Module({
  controllers: [PlatformDashboardController],
  providers: [
    PlatformDashboardService,
    PlatformDashboardRepository,
    GetPlatformDashboardOverviewUseCase,
    GetPlatformDashboardChartsUseCase,
    GetPlatformDashboardHealthUseCase,
  ],
})
export class PlatformDashboardModule {}

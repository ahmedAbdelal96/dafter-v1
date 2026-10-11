import { Module } from '@nestjs/common';
import { FinancialReportsModule } from '../financial-reports/financial-reports.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({ imports: [FinancialReportsModule], controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}

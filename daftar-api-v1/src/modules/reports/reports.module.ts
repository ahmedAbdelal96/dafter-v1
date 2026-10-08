// ============================================
// Reports Module — Wiring
// ============================================
// Architecture:
//   Controller → Service → Use Cases → Repository → Prisma
//
// This module is self-contained:
//   - No cross-module imports needed (uses PrismaService directly)
//   - All party name resolution is handled inside ReportsRepository
//     using direct Prisma queries (avoids circular dependencies)
//
// Exports: none (reports are read-only, no other module needs them)
// ============================================

import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';
import {
  GetSummaryUseCase,
  GetOverdueUseCase,
  GetCollectionScheduleUseCase,
  GetProfitLossUseCase,
  GetCashFlowUseCase,
  GetCustomersAgingUseCase,
  GetSuppliersAgingUseCase,
  GetSalesDetailedUseCase,
  GetCollectionsFollowupUseCase,
  GetExpensesAnalyticsUseCase,
  GetDebtsSummaryUseCase,
  GetProductsPerformanceUseCase,
  GetOperationalPerformanceUseCase,
  GetCriticalAlertsUseCase,
  GetStaffActivityUseCase,
  GetLedgerStatementReportUseCase,
  GetSimpleLedgerUseCase,
} from './use-cases';

@Module({
  controllers: [ReportsController],
  providers: [
    // Service layer
    ReportsService,

    // Data access
    ReportsRepository,

    // Use Cases (one per business operation — SRP)
    GetSummaryUseCase,
    GetOverdueUseCase,
    GetCollectionScheduleUseCase,
    GetProfitLossUseCase,
    GetCashFlowUseCase,
    GetCustomersAgingUseCase,
    GetSuppliersAgingUseCase,
    GetSalesDetailedUseCase,
    GetCollectionsFollowupUseCase,
    GetExpensesAnalyticsUseCase,
    GetDebtsSummaryUseCase,
    GetProductsPerformanceUseCase,
    GetOperationalPerformanceUseCase,
    GetCriticalAlertsUseCase,
    GetStaffActivityUseCase,
    GetLedgerStatementReportUseCase,
    GetSimpleLedgerUseCase,
  ],
  exports: [],
})
export class ReportsModule {}

// ============================================
// Reports Service — Orchestration Layer
// ============================================
// Thin wrapper — delegates to use cases only.
// No business logic here.
//
// Provides a single facade for the reports controller.
// ============================================

import { Injectable } from '@nestjs/common';
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
import { QueryReportsDto } from './dto/query-reports.dto';
import { QueryCollectionDto } from './dto/query-collection.dto';
import { QueryProfitLossDto } from './dto/query-profit-loss.dto';
import { QueryCashFlowDto } from './dto/query-cash-flow.dto';
import { QueryAgingDto } from './dto/query-aging.dto';
import { QuerySalesDetailedDto } from './dto/query-sales-detailed.dto';
import { QueryCollectionsFollowupDto } from './dto/query-collections-followup.dto';
import { QueryExpensesAnalyticsDto } from './dto/query-expenses-analytics.dto';
import { QueryDebtsSummaryDto } from './dto/query-debts-summary.dto';
import { QueryProductsPerformanceDto } from './dto/query-products-performance.dto';
import { QueryOperationalPerformanceDto } from './dto/query-operational-performance.dto';
import { QueryCriticalAlertsDto } from './dto/query-critical-alerts.dto';
import { QueryStaffActivityDto } from './dto/query-staff-activity.dto';
import { QueryLedgerReportDto } from './dto/query-ledger-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly getSummaryUC: GetSummaryUseCase,
    private readonly getOverdueUC: GetOverdueUseCase,
    private readonly getCollectionScheduleUC: GetCollectionScheduleUseCase,
    private readonly getProfitLossUC: GetProfitLossUseCase,
    private readonly getCashFlowUC: GetCashFlowUseCase,
    private readonly getCustomersAgingUC: GetCustomersAgingUseCase,
    private readonly getSuppliersAgingUC: GetSuppliersAgingUseCase,
    private readonly getSalesDetailedUC: GetSalesDetailedUseCase,
    private readonly getCollectionsFollowupUC: GetCollectionsFollowupUseCase,
    private readonly getExpensesAnalyticsUC: GetExpensesAnalyticsUseCase,
    private readonly getDebtsSummaryUC: GetDebtsSummaryUseCase,
    private readonly getProductsPerformanceUC: GetProductsPerformanceUseCase,
    private readonly getOperationalPerformanceUC: GetOperationalPerformanceUseCase,
    private readonly getCriticalAlertsUC: GetCriticalAlertsUseCase,
    private readonly getStaffActivityUC: GetStaffActivityUseCase,
    private readonly getLedgerStatementReportUC: GetLedgerStatementReportUseCase,
    private readonly getSimpleLedgerUC: GetSimpleLedgerUseCase,
  ) {}

  getSummary(companyId: string, query: QueryReportsDto) {
    return this.getSummaryUC.execute(companyId, query);
  }

  getOverdue(companyId: string, query: QueryReportsDto) {
    return this.getOverdueUC.execute(companyId, query);
  }

  getCollectionSchedule(companyId: string, query: QueryCollectionDto) {
    return this.getCollectionScheduleUC.execute(companyId, query);
  }

  getProfitLoss(companyId: string, query: QueryProfitLossDto) {
    return this.getProfitLossUC.execute(companyId, query);
  }

  getCashFlow(companyId: string, query: QueryCashFlowDto) {
    return this.getCashFlowUC.execute(companyId, query);
  }

  getCustomersAging(companyId: string, query: QueryAgingDto) {
    return this.getCustomersAgingUC.execute(companyId, query);
  }

  getSuppliersAging(companyId: string, query: QueryAgingDto) {
    return this.getSuppliersAgingUC.execute(companyId, query);
  }

  getSalesDetailed(companyId: string, query: QuerySalesDetailedDto) {
    return this.getSalesDetailedUC.execute(companyId, query);
  }

  getCollectionsFollowup(companyId: string, query: QueryCollectionsFollowupDto) {
    return this.getCollectionsFollowupUC.execute(companyId, query);
  }

  getExpensesAnalytics(companyId: string, query: QueryExpensesAnalyticsDto) {
    return this.getExpensesAnalyticsUC.execute(companyId, query);
  }

  getDebtsSummary(companyId: string, query: QueryDebtsSummaryDto) {
    return this.getDebtsSummaryUC.execute(companyId, query);
  }

  getProductsPerformance(companyId: string, query: QueryProductsPerformanceDto) {
    return this.getProductsPerformanceUC.execute(companyId, query);
  }

  getOperationalPerformance(
    companyId: string,
    query: QueryOperationalPerformanceDto,
  ) {
    return this.getOperationalPerformanceUC.execute(companyId, query);
  }

  getCriticalAlerts(companyId: string, query: QueryCriticalAlertsDto) {
    return this.getCriticalAlertsUC.execute(companyId, query);
  }

  getStaffActivity(companyId: string, query: QueryStaffActivityDto) {
    return this.getStaffActivityUC.execute(companyId, query);
  }

  getLedgerStatementReport(companyId: string, query: QueryLedgerReportDto) {
    return this.getLedgerStatementReportUC.execute(companyId, query);
  }

  getSimpleLedger(companyId: string, query: QueryLedgerReportDto) {
    return this.getSimpleLedgerUC.execute(companyId, query);
  }
}

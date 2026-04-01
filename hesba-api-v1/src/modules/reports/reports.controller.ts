// ============================================
// Reports Controller Ã¢â‚¬â€ HTTP Endpoints
// ============================================
// Endpoints:
//   GET /reports/summary             Ã¢â‚¬â€ Ã™â€¦Ã™â€žÃ˜Â®Ã˜Âµ Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â´Ã˜Â§Ã™â€¦Ã™â€ž
//   GET /reports/overdue             Ã¢â‚¬â€ Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã™Å Ã™â€ 
//   GET /reports/collection-schedule Ã¢â‚¬â€ Ã˜Â¬Ã˜Â¯Ã™Ë†Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜ÂµÃ™Å Ã™â€ž
//
// Guard Strategy:
//   @ProtectedRead()                 Ã¢â‚¬â€ JWT + Subscription (read mode)
//   @UseGuards(PermissionsGuard)     Ã¢â‚¬â€ Check Staff permissions
//   @RequirePermissions('viewReports') Ã¢â‚¬â€ Reports-specific permission flag
//
// Note: Decorator order matters!
//   @UseGuards(PermissionsGuard) MUST be declared ABOVE @ProtectedRead()
//   See subscription.decorator.ts for full explanation.
// ============================================

import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
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
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  ProtectedRead,
} from '../../common/decorators/subscription.decorator';

import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FeatureKey } from '../../common/entitlements/feature-catalog';
import {
  ReportsApiTags,
  SummarySwagger,
  OverdueSwagger,
  CollectionScheduleSwagger,
  ProfitLossSwagger,
  CashFlowSwagger,
  CustomersAgingSwagger,
  SuppliersAgingSwagger,
  SalesDetailedSwagger,
  CollectionsFollowupSwagger,
  ExpensesAnalyticsSwagger,
  DebtsSummarySwagger,
  ProductsPerformanceSwagger,
  OperationalPerformanceSwagger,
  CriticalAlertsSwagger,
  StaffActivitySwagger,
  LedgerStatementSwagger,
  SimpleLedgerSwagger,
} from './swagger/reports.swagger';

@Controller('reports')

@RequireFeature(FeatureKey.REPORTS_READ)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly t: TranslationService,
  ) {}

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /reports/summary Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Get('summary')
  @SummarySwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getSummary(
    @CurrentTenant() companyId: string,
    @Query() query: QueryReportsDto,
  ) {
    const data = await this.reportsService.getSummary(companyId, query);
    return new ApiResponseDto(
      data,
      this.t.translate('reports.summary.success'),
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /reports/overdue Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Get('overdue')
  @OverdueSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getOverdue(
    @CurrentTenant() companyId: string,
    @Query() query: QueryReportsDto,
  ) {
    const result = await this.reportsService.getOverdue(companyId, query);
    const response = new ApiResponseDto(
      {
        deferredSales: result.deferredSales,
        installmentSchedules: result.installmentSchedules,
      },
      this.t.translate('reports.overdue.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /reports/collection-schedule Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Get('collection-schedule')
  @CollectionScheduleSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getCollectionSchedule(
    @CurrentTenant() companyId: string,
    @Query() query: QueryCollectionDto,
  ) {
    const result = await this.reportsService.getCollectionSchedule(
      companyId,
      query,
    );
    const response = new ApiResponseDto(
      result.items,
      this.t.translate('reports.collectionSchedule.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('profit-loss')
  @ProfitLossSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getProfitLoss(
    @CurrentTenant() companyId: string,
    @Query() query: QueryProfitLossDto,
  ) {
    const data = await this.reportsService.getProfitLoss(companyId, query);
    return new ApiResponseDto(
      data,
      this.t.translate('reports.profitLoss.success'),
    );
  }

  @Get('cash-flow')
  @CashFlowSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getCashFlow(
    @CurrentTenant() companyId: string,
    @Query() query: QueryCashFlowDto,
  ) {
    const result = await this.reportsService.getCashFlow(companyId, query);
    const response = new ApiResponseDto(
      {
        period: result.period,
        totals: result.totals,
        items: result.items,
      },
      this.t.translate('reports.cashFlow.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('customers-aging')
  @CustomersAgingSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getCustomersAging(
    @CurrentTenant() companyId: string,
    @Query() query: QueryAgingDto,
  ) {
    const result = await this.reportsService.getCustomersAging(companyId, query);
    const response = new ApiResponseDto(
      {
        asOfDate: result.asOfDate,
        summary: result.summary,
        items: result.items,
      },
      this.t.translate('reports.customersAging.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('suppliers-aging')
  @SuppliersAgingSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getSuppliersAging(
    @CurrentTenant() companyId: string,
    @Query() query: QueryAgingDto,
  ) {
    const result = await this.reportsService.getSuppliersAging(companyId, query);
    const response = new ApiResponseDto(
      {
        asOfDate: result.asOfDate,
        summary: result.summary,
        items: result.items,
      },
      this.t.translate('reports.suppliersAging.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('sales-detailed')
  @SalesDetailedSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getSalesDetailed(
    @CurrentTenant() companyId: string,
    @Query() query: QuerySalesDetailedDto,
  ) {
    const result = await this.reportsService.getSalesDetailed(companyId, query);
    const response = new ApiResponseDto(
      {
        summary: result.summary,
        items: result.items,
      },
      this.t.translate('reports.salesDetailed.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('collections-followup')
  @CollectionsFollowupSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getCollectionsFollowup(
    @CurrentTenant() companyId: string,
    @Query() query: QueryCollectionsFollowupDto,
  ) {
    const result = await this.reportsService.getCollectionsFollowup(companyId, query);
    const response = new ApiResponseDto(
      {
        period: result.period,
        summary: result.summary,
        items: result.items,
      },
      this.t.translate('reports.collectionsFollowup.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('expenses-analytics')
  @ExpensesAnalyticsSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getExpensesAnalytics(
    @CurrentTenant() companyId: string,
    @Query() query: QueryExpensesAnalyticsDto,
  ) {
    const result = await this.reportsService.getExpensesAnalytics(companyId, query);
    const response = new ApiResponseDto(
      {
        period: result.period,
        summary: result.summary,
        byCategory: result.byCategory,
        comparison: result.comparison,
        items: result.items,
      },
      this.t.translate('reports.expensesAnalytics.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('debts-summary')
  @DebtsSummarySwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getDebtsSummary(
    @CurrentTenant() companyId: string,
    @Query() query: QueryDebtsSummaryDto,
  ) {
    const result = await this.reportsService.getDebtsSummary(companyId, query);
    const response = new ApiResponseDto(
      {
        totals: result.totals,
        items: result.items,
      },
      this.t.translate('reports.debtsSummary.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('products-performance')
  @ProductsPerformanceSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getProductsPerformance(
    @CurrentTenant() companyId: string,
    @Query() query: QueryProductsPerformanceDto,
  ) {
    const result = await this.reportsService.getProductsPerformance(companyId, query);
    const response = new ApiResponseDto(
      {
        summary: result.summary,
        items: result.items,
      },
      this.t.translate('reports.productsPerformance.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('operational-performance')
  @OperationalPerformanceSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getOperationalPerformance(
    @CurrentTenant() companyId: string,
    @Query() query: QueryOperationalPerformanceDto,
  ) {
    const data = await this.reportsService.getOperationalPerformance(companyId, query);
    return new ApiResponseDto(
      data,
      this.t.translate('reports.operationalPerformance.success'),
    );
  }

  @Get('critical-alerts')
  @CriticalAlertsSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getCriticalAlerts(
    @CurrentTenant() companyId: string,
    @Query() query: QueryCriticalAlertsDto,
  ) {
    const data = await this.reportsService.getCriticalAlerts(companyId, query);
    return new ApiResponseDto(
      data,
      this.t.translate('reports.criticalAlerts.success'),
    );
  }

  @Get('staff-activity')
  @StaffActivitySwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getStaffActivity(
    @CurrentTenant() companyId: string,
    @Query() query: QueryStaffActivityDto,
  ) {
    const result = await this.reportsService.getStaffActivity(companyId, query);
    const response = new ApiResponseDto(
      {
        period: result.period,
        summary: result.summary,
        items: result.items,
      },
      this.t.translate('reports.staffActivity.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('ledger-statement')
  @LedgerStatementSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getLedgerStatement(
    @CurrentTenant() companyId: string,
    @Query() query: QueryLedgerReportDto,
  ) {
    const result = await this.reportsService.getLedgerStatementReport(companyId, query);
    const response = new ApiResponseDto(
      {
        party: result.party,
        openingBalance: result.openingBalance,
        closingBalance: result.closingBalance,
        currentBalance: result.currentBalance,
        totalDebit: result.totalDebit,
        totalCredit: result.totalCredit,
        items: result.items,
      },
      this.t.translate('reports.ledgerStatement.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('simple-ledger')
  @SimpleLedgerSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async getSimpleLedger(
    @CurrentTenant() companyId: string,
    @Query() query: QueryLedgerReportDto,
  ) {
    const result = await this.reportsService.getSimpleLedger(companyId, query);
    const response = new ApiResponseDto(
      {
        party: result.party,
        openingBalance: result.openingBalance,
        closingBalance: result.closingBalance,
        currentBalance: result.currentBalance,
        totalDebit: result.totalDebit,
        totalCredit: result.totalCredit,
        items: result.items,
      },
      this.t.translate('reports.simpleLedger.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }
}


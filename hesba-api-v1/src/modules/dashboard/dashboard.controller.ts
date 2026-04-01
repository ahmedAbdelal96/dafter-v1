import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  QueryDashboardAlertsDto,
  QueryDashboardChartsDto,
  QueryDashboardDto,
  QueryDashboardHighlightsDto,
} from './dto/query-dashboard.dto';
import { ProtectedRead } from '../../common/decorators/subscription.decorator';

import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FeatureKey } from '../../common/entitlements/feature-catalog';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import { UserRole } from '@prisma/client';

@Controller('dashboard')

@RequireFeature(FeatureKey.DASHBOARD_READ)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly t: TranslationService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Company dashboard overview KPIs' })
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
  @RequirePermissions('viewReports')
  async getOverview(
    @Query() query: QueryDashboardDto,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.dashboardService.getOverview(companyId, query);
    return new ApiResponseDto(
      data,
      this.t.translate('dashboard.overview.success'),
    );
  }

  @Get('charts')
  @ApiOperation({ summary: 'Company dashboard chart datasets' })
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
  @RequirePermissions('viewReports')
  async getCharts(
    @Query() query: QueryDashboardChartsDto,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.dashboardService.getCharts(companyId, query);
    return new ApiResponseDto(data, this.t.translate('dashboard.charts.success'));
  }

  @Get('highlights')
  @ApiOperation({ summary: 'Company dashboard top entities' })
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
  @RequirePermissions('viewReports')
  async getHighlights(
    @Query() query: QueryDashboardHighlightsDto,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.dashboardService.getHighlights(companyId, query);
    return new ApiResponseDto(
      data,
      this.t.translate('dashboard.highlights.success'),
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Company dashboard actionable alerts' })
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
  @RequirePermissions('viewReports')
  async getAlerts(
    @Query() query: QueryDashboardAlertsDto,
    @CurrentTenant() companyId: string,
  ) {
    const data = await this.dashboardService.getAlerts(companyId, query);
    return new ApiResponseDto(data, this.t.translate('dashboard.alerts.success'));
  }

  @Get('receivables')
  @ApiOperation({ summary: 'Receivables overview: totals, overdue, due today/week' })
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
  @RequirePermissions('viewReports')
  async getReceivables(@CurrentTenant() companyId: string) {
    const data = await this.dashboardService.getReceivables(companyId);
    return new ApiResponseDto(data, this.t.translate('dashboard.receivables.success'));
  }
}


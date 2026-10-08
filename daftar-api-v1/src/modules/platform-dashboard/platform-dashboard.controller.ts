import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { NoSubscriptionCheck } from '../../common/decorators/subscription.decorator';
import { TranslationService } from '../../common/services/translation.service';
import { PlatformDashboardService } from './platform-dashboard.service';
import {
  QueryPlatformDashboardChartsDto,
  QueryPlatformDashboardDto,
  QueryPlatformDashboardHealthDto,
} from './dto/query-platform-dashboard.dto';

@Controller('platform-dashboard')
@ApiTags('Platform Dashboard')
@ApiBearerAuth()
export class PlatformDashboardController {
  constructor(
    private readonly platformDashboardService: PlatformDashboardService,
    private readonly t: TranslationService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform dashboard overview KPIs' })
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  async getOverview(@Query() query: QueryPlatformDashboardDto) {
    const data = await this.platformDashboardService.getOverview(query);
    return new ApiResponseDto(
      data,
      this.t.translate('platformDashboard.overview.success'),
    );
  }

  @Get('charts')
  @ApiOperation({ summary: 'Platform dashboard chart datasets' })
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  async getCharts(@Query() query: QueryPlatformDashboardChartsDto) {
    const data = await this.platformDashboardService.getCharts(query);
    return new ApiResponseDto(
      data,
      this.t.translate('platformDashboard.charts.success'),
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Platform dashboard operational health lists' })
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  async getHealth(@Query() query: QueryPlatformDashboardHealthDto) {
    const data = await this.platformDashboardService.getHealth(query);
    return new ApiResponseDto(
      data,
      this.t.translate('platformDashboard.health.success'),
    );
  }
}


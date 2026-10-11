import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ProtectedRead } from '../../common/decorators/subscription.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard.dto';

@Controller('dashboard')
@UseGuards(PermissionsGuard)
@ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
@RequirePermissions('viewFinancialReports')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get('overview') overview(@CurrentTenant() c: string, @Query() q: DashboardQueryDto) { return this.wrap(this.service.overview(c, q)); }
  @Get('charts') charts(@CurrentTenant() c: string, @Query() q: DashboardQueryDto) { return this.wrap(this.service.charts(c, q)); }
  @Get('highlights') highlights(@CurrentTenant() c: string, @Query() q: DashboardQueryDto) { return this.wrap(this.service.highlights(c, q)); }
  @Get('alerts') alerts(@CurrentTenant() c: string, @Query() q: DashboardQueryDto) { return this.wrap(this.service.alerts(c, q)); }
  private async wrap<T>(result: Promise<T>) { return new ApiResponseDto(await result); }
}

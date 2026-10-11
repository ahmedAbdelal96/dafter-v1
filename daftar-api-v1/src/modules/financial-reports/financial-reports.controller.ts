import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ProtectedRead } from '../../common/decorators/subscription.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { FinancialReportsService } from './financial-reports.service';
import { AsOfDateQueryDto, GeneralLedgerQueryDto, PeriodCloseQueryDto, ReportDateRangeDto, StatementQueryDto, TrialBalanceQueryDto } from './dto/financial-reports.dto';

@Controller('financial-reports')
@UseGuards(PermissionsGuard)
@ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
@RequirePermissions('viewFinancialReports')
export class FinancialReportsController {
  constructor(private readonly service: FinancialReportsService) {}
  @Get('general-ledger') gl(@CurrentTenant() c: string, @Query() q: GeneralLedgerQueryDto) { return this.wrap(this.service.generalLedger(c, q)); }
  @Get('trial-balance') tb(@CurrentTenant() c: string, @Query() q: TrialBalanceQueryDto) { return this.wrap(this.service.trialBalance(c, q)); }
  @Get('profit-loss') pl(@CurrentTenant() c: string, @Query() q: ReportDateRangeDto) { return this.wrap(this.service.profitLoss(c, q)); }
  @Get('balance-sheet') bs(@CurrentTenant() c: string, @Query() q: AsOfDateQueryDto) { return this.wrap(this.service.balanceSheet(c, q)); }
  @Get('ar-aging') ar(@CurrentTenant() c: string, @Query() q: AsOfDateQueryDto) { return this.wrap(this.service.aging(c, q, 'ar')); }
  @Get('ap-aging') ap(@CurrentTenant() c: string, @Query() q: AsOfDateQueryDto) { return this.wrap(this.service.aging(c, q, 'ap')); }
  @Get('customer-statement') customer(@CurrentTenant() c: string, @Query() q: StatementQueryDto) { return this.wrap(this.service.statement(c, q, 'customer')); }
  @Get('supplier-statement') supplier(@CurrentTenant() c: string, @Query() q: StatementQueryDto) { return this.wrap(this.service.statement(c, q, 'supplier')); }
  @Get('period-close-readiness') close(@CurrentTenant() c: string, @Query() q: PeriodCloseQueryDto) { return this.wrap(this.service.periodClose(c, q)); }
  private async wrap<T>(result: Promise<T>) { return new ApiResponseDto(await result); }
}

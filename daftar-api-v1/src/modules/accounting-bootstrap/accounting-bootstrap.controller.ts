import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  ProtectedRead,
  ProtectedWrite,
} from '../../common/decorators/subscription.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/types';
import { AccountingReadinessService } from './accounting-readiness.service';
import { InitializeCompanyAccounting } from './accounting-bootstrap.service';
import { InitializeCompanyAccountingDto, ReadinessQueryDto } from './dto';

@Controller('accounting-bootstrap')
export class AccountingBootstrapController {
  constructor(
    private readonly initializer: InitializeCompanyAccounting,
    private readonly readiness: AccountingReadinessService,
  ) {}

  @Get('readiness')
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewAccountingSetup')
  async getReadiness(
    @CurrentTenant() companyId: string,
    @Query() query: ReadinessQueryDto,
  ) {
    return new ApiResponseDto(
      await this.readiness.evaluate(
        companyId,
        query.postingDate ? new Date(query.postingDate) : undefined,
      ),
      'Accounting readiness retrieved successfully',
    );
  }

  @Post('initialize')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageAccountingSetup')
  async initialize(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyHeader: string | undefined,
    @Body() dto: InitializeCompanyAccountingDto,
  ) {
    return new ApiResponseDto(
      await this.initializer.execute({
        companyId,
        actorUserId: user.id,
        idempotencyKey: idempotencyHeader?.trim() || dto.idempotencyKey || '',
        countryCode: dto.countryCode,
        localeCode: dto.localeCode,
        baseCurrencyCode: dto.baseCurrencyCode,
        templateCode: dto.templateCode,
        templateVersion: dto.templateVersion,
        fiscalYearStart: new Date(dto.fiscalYearStart),
        fiscalYearEnd: new Date(dto.fiscalYearEnd),
      }),
      'Accounting foundation initialized successfully',
    );
  }
}

import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ProtectedWrite } from '../../common/decorators/subscription.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/types';
import { CreateOpeningBalanceDto, ReverseOpeningBalanceDto } from './dto';
import { OpeningBalancesService } from './opening-balances.service';

@Controller('opening-balances')
export class OpeningBalancesController {
  constructor(private readonly opening: OpeningBalancesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageOpeningBalances')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOpeningBalanceDto,
  ) {
    return new ApiResponseDto(
      await this.opening.createDraft({
        companyId,
        actorUserId: user.id,
        idempotencyKey: dto.idempotencyKey,
        effectiveDate: new Date(dto.effectiveDate),
        accountingPeriodId: dto.accountingPeriodId,
        description: dto.description,
        lines: dto.lines,
      }),
      'Opening balance draft created successfully',
    );
  }

  @Post(':id/validate')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageOpeningBalances')
  async validate(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.opening.validate(companyId, user.id, id),
      'Opening balance validated successfully',
    );
  }

  @Post(':id/post')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageOpeningBalances')
  async post(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('idempotencyKey') idempotencyKey: string,
  ) {
    return new ApiResponseDto(
      await this.opening.post(companyId, user.id, id, idempotencyKey),
      'Opening balance posted successfully',
    );
  }

  @Post(':id/reverse')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageOpeningBalances')
  async reverse(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseOpeningBalanceDto,
  ) {
    return new ApiResponseDto(
      await this.opening.reverse(companyId, user.id, id, dto),
      'Opening balance reversed successfully',
    );
  }
}

// ============================================
// Companies Controller — Tenant Self-Management
// ============================================
// Endpoints for a company owner/staff to read
// and update their OWN company profile.
//
// Guards: JwtAuthGuard (global) is applied automatically.
// Route: /companies/me
// Access: Any authenticated company user (OWNER or STAFF).
//         SUPER_ADMIN users have no companyId → 403.
// ============================================

import {
  Controller,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UpdateMyCompanyDto } from './dto/update-my-company.dto';
import { UpdateCashReconciliationModeDto } from './dto/update-cash-reconciliation-mode.dto';
import { GetMyCompanyUseCase } from './use-cases/get-my-company.use-case';
import { UpdateMyCompanyUseCase } from './use-cases/update-my-company.use-case';
import { GetCashReconciliationModeUseCase } from './use-cases/get-cash-reconciliation-mode.use-case';
import { UpdateCashReconciliationModeUseCase } from './use-cases/update-cash-reconciliation-mode.use-case';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import { UserRole } from '@prisma/client';
import {
  OwnerOnly,
  NoSubscriptionCheck,
} from '../../common/decorators/subscription.decorator';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly getMyCompanyUC: GetMyCompanyUseCase,
    private readonly updateMyCompanyUC: UpdateMyCompanyUseCase,
    private readonly getCashModeUC: GetCashReconciliationModeUseCase,
    private readonly updateCashModeUC: UpdateCashReconciliationModeUseCase,
    private readonly t: TranslationService,
  ) {}

  /**
   * GET /companies/me
   * Returns the authenticated user's own company profile,
   * including the active subscription details.
   */
  @Get('me')
  @NoSubscriptionCheck(UserRole.OWNER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Get my company profile',
    description:
      'Returns the company profile for the authenticated company user, ' +
      'including the active subscription.',
  })
  @HttpCode(HttpStatus.OK)
  async getMyCompany(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.getMyCompanyUC.execute(user.companyId);
    return new ApiResponseDto(data, this.t.translate('companies.get.success'));
  }

  /**
   * PATCH /companies/me
   * Allows the authenticated user to update their company profile.
   * Only OWNER role should call this in practice (guard enforced in business logic
   * via company subscription guard, but any staff member could read).
   */
  @Patch('me')
  @NoSubscriptionCheck(UserRole.OWNER)
  @ApiOperation({
    summary: 'Update my company profile',
    description:
      'Updates the company profile for the authenticated company owner. ' +
      'Supports partial updates — only provided fields are changed.',
  })
  @HttpCode(HttpStatus.OK)
  async updateMyCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMyCompanyDto,
  ) {
    const data = await this.updateMyCompanyUC.execute(user.companyId, dto);
    return new ApiResponseDto(
      data,
      this.t.translate('companies.update.success'),
    );
  }

  @Get('me/cash-reconciliation-mode')
  @NoSubscriptionCheck(UserRole.OWNER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Get my company cash reconciliation mode',
    description:
      'Returns the company-level cash reconciliation mode and last update metadata.',
  })
  @HttpCode(HttpStatus.OK)
  async getCashReconciliationMode(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.getCashModeUC.execute(user.companyId);
    return new ApiResponseDto(
      data,
      this.t.translate('companies.cashMode.getSuccess'),
    );
  }

  @Patch('me/cash-reconciliation-mode')
  @OwnerOnly()
  @ApiOperation({
    summary: 'Update my company cash reconciliation mode',
    description:
      'Updates company-level mode: DISABLED or SIMPLE_DAILY. Owner only.',
  })
  @HttpCode(HttpStatus.OK)
  async updateCashReconciliationMode(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCashReconciliationModeDto,
  ) {
    const data = await this.updateCashModeUC.execute(
      user.companyId,
      user.id,
      dto,
    );
    return new ApiResponseDto(
      data,
      this.t.translate('companies.cashMode.updateSuccess'),
    );
  }
}

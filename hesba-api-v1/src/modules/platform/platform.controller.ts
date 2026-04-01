import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Headers,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PlatformService } from './platform.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  ArchiveCompanyDto,
  DeleteCompanyDto,
  CompanyQueryDto,
  CreatePlanDto,
  UpdatePlanDto,
  ActivateSubscriptionDto,
  SuspendSubscriptionDto,
  ExtendSubscriptionDto,
  ChangePlanDto,
  PlatformCompanyScopeDto,
  PlatformUserQueryDto,
  PlatformCreateStaffDto,
  PlatformUpdateUserDto,
  PlatformUpdatePermissionsDto,
  PlatformResetUserCredentialsDto,
  UpdatePlatformSettingsDto,
  CreatePlatformFeatureFlagDto,
  UpdatePlatformFeatureFlagDto,
} from './dto';
import { NoSubscriptionCheck } from '../../common/decorators/subscription.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import {
  PlatformApiTags,
  CreateCompanySwagger,
  UpdateCompanySwagger,
  DisableCompanySwagger,
  EnableCompanySwagger,
  ListCompaniesSwagger,
  GetCompanySwagger,
  GetCompanyMetricsSwagger,
  CreatePlanSwagger,
  ListPlansSwagger,
  UpdatePlanSwagger,
  ActivateSubscriptionSwagger,
  SuspendSubscriptionSwagger,
  ExtendSubscriptionSwagger,
} from './swagger/platform.swagger';

@Controller('platform')
@PlatformApiTags()
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly t: TranslationService,
  ) {}

  @Post('companies')
  @CreateCompanySwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  async createCompany(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.createCompany(dto, user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.companies.create.success'),
    );
  }

  @Patch('companies/:id')
  @UpdateCompanySwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.updateCompany(id, dto, user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.companies.update.success'),
    );
  }

  @Patch('companies/:id/disable')
  @DisableCompanySwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async disableCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.disableCompany(id, user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.companies.disable.success'),
    );
  }

  @Patch('companies/:id/enable')
  @EnableCompanySwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async enableCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.enableCompany(id, user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.companies.enable.success'),
    );
  }

  @Patch('companies/:id/archive')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async archiveCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ArchiveCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.archiveCompany(id, dto, user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.companies.archive.success'),
    );
  }

  @Patch('companies/:id/restore')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async restoreCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ArchiveCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.restoreCompany(id, dto, user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.companies.restore.success'),
    );
  }

  @Delete('companies/:id')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.deleteCompany(id, dto, user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.companies.delete.success'),
    );
  }

  @Get('companies')
  @ListCompaniesSwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async listCompanies(@Query() query: CompanyQueryDto) {
    const data = await this.platformService.listCompanies(query);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.companies.list.success'),
    );
  }

  @Get('companies/:id')
  @GetCompanySwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getCompany(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.platformService.getCompany(id);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.companies.get.success'),
    );
  }

  @Get('companies/:id/metrics')
  @GetCompanyMetricsSwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getCompanyMetrics(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.platformService.getCompanyMetrics(id);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.companies.metrics.success'),
    );
  }

  @Post('plans')
  @CreatePlanSwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  async createPlan(@Body() dto: CreatePlanDto) {
    const data = await this.platformService.createPlan(dto);
    return new ApiResponseDto(data, this.t.translate('platform.plans.create.success'));
  }

  @Get('plans')
  @ListPlansSwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async listPlans(@Query('includeInactive') includeInactive?: string) {
    const data = await this.platformService.listPlans(includeInactive === 'true');
    return new ApiResponseDto(data, this.t.translate('platform.plans.list.success'));
  }

  @Patch('plans/:id')
  @UpdatePlanSwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    const data = await this.platformService.updatePlan(id, dto);
    return new ApiResponseDto(data, this.t.translate('platform.plans.update.success'));
  }

  @Post('subscriptions/activate')
  @ActivateSubscriptionSwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  async activateSubscription(
    @Body() dto: ActivateSubscriptionDto,
    @Headers('idempotency-key') idempotencyHeader: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.activateSubscription(
      dto,
      user.id,
      idempotencyHeader?.trim() || dto.idempotencyKey?.trim(),
    );
    return new ApiResponseDto(
      data,
      this.t.translate('platform.subscriptions.activate.success'),
    );
  }

  @Post('subscriptions/suspend')
  @SuspendSubscriptionSwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async suspendSubscription(
    @Body() dto: SuspendSubscriptionDto,
    @Headers('idempotency-key') idempotencyHeader: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.suspendSubscription(
      dto,
      user.id,
      idempotencyHeader?.trim() || dto.idempotencyKey?.trim(),
    );
    return new ApiResponseDto(
      data,
      this.t.translate('platform.subscriptions.suspend.success'),
    );
  }

  @Post('subscriptions/extend')
  @ExtendSubscriptionSwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async extendSubscription(
    @Body() dto: ExtendSubscriptionDto,
    @Headers('idempotency-key') idempotencyHeader: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.extendSubscription(
      dto,
      user.id,
      idempotencyHeader?.trim() || dto.idempotencyKey?.trim(),
    );
    return new ApiResponseDto(
      data,
      this.t.translate('platform.subscriptions.extend.success'),
    );
  }

  @Post('subscriptions/change-plan')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async changePlan(
    @Body() dto: ChangePlanDto,
    @Headers('idempotency-key') idempotencyHeader: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.changePlan(
      dto,
      user.id,
      idempotencyHeader?.trim() || dto.idempotencyKey?.trim(),
    );
    return new ApiResponseDto(
      data,
      this.t.translate('platform.subscriptions.activate.success'),
    );
  }

  // -- Platform Users -------------------------------------------------------

  @Post('users/staff')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  async createStaff(
    @Body() dto: PlatformCreateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.createStaff(dto, user.id);
    return new ApiResponseDto(data, this.t.translate('platform.users.create.success'));
  }

  @Get('users/stats')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUsersStats(@Query() query: PlatformCompanyScopeDto) {
    const data = await this.platformService.getUsersStats(query.companyId);
    return new ApiResponseDto(data, this.t.translate('platform.users.stats.success'));
  }

  @Get('users')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async listUsers(@Query() query: PlatformUserQueryDto) {
    const result = await this.platformService.listUsers(query);
    const response = new ApiResponseDto(
      result.items,
      this.t.translate('platform.users.list.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('users/:id')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Query() query: PlatformCompanyScopeDto,
  ) {
    const data = await this.platformService.getUser(query.companyId, userId);
    return new ApiResponseDto(data, this.t.translate('platform.users.get.success'));
  }

  @Patch('users/:id')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: PlatformUpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.updateUser(userId, dto, user.id);
    return new ApiResponseDto(data, this.t.translate('platform.users.update.success'));
  }

  @Patch('users/:id/permissions')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updatePermissions(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: PlatformUpdatePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.updatePermissions(userId, dto, user.id);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.users.permissions.updated'),
    );
  }

  @Patch('users/:id/disable')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async disableUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: PlatformCompanyScopeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.disableUser(
      dto.companyId,
      userId,
      user.id,
    );
    return new ApiResponseDto(data, this.t.translate('platform.users.disable.success'));
  }

  @Patch('users/:id/enable')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async enableUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: PlatformCompanyScopeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.enableUser(
      dto.companyId,
      userId,
      user.id,
    );
    return new ApiResponseDto(data, this.t.translate('platform.users.enable.success'));
  }

  @Post('users/:id/credentials/reset')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async resetUserCredentials(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: PlatformResetUserCredentialsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.platformService.resetUserCredentials(
      userId,
      dto,
      user.id,
    );
    return new ApiResponseDto(data, this.t.translate('common.success'));
  }

  // -- Platform Settings ----------------------------------------------------

  @Get('settings')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getSettings() {
    const data = await this.platformService.getSettings();
    return new ApiResponseDto(data, this.t.translate('common.success'));
  }

  @Patch('settings')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateSettings(@Body() dto: UpdatePlatformSettingsDto) {
    const data = await this.platformService.updateSettings(dto);
    return new ApiResponseDto(data, this.t.translate('common.success'));
  }

  @Get('settings/feature-flags')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getFeatureFlags() {
    const data = await this.platformService.getFeatureFlags();
    return new ApiResponseDto(data, this.t.translate('common.success'));
  }

  @Post('settings/feature-flags')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  async createFeatureFlag(@Body() dto: CreatePlatformFeatureFlagDto) {
    const data = await this.platformService.createFeatureFlag(dto);
    return new ApiResponseDto(data, this.t.translate('common.success'));
  }

  @Patch('settings/feature-flags/:name')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateFeatureFlag(
    @Param('name') name: string,
    @Body() dto: UpdatePlatformFeatureFlagDto,
  ) {
    const data = await this.platformService.updateFeatureFlag(name, dto);
    return new ApiResponseDto(data, this.t.translate('common.success'));
  }

  @Get('capabilities')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getCapabilities() {
    const data = this.platformService.getCapabilities();
    return new ApiResponseDto(data, this.t.translate('common.success'));
  }
}


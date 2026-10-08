import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
  ParseEnumPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TaxModuleKey } from '@prisma/client';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ProtectedRead } from '../../../common/decorators/subscription.decorator';
import type { AuthenticatedUser } from '../../../common/types';
import {
  CreateTaxRateDto,
  CreateTaxRegistrationProfileDto,
  CreateTaxTreatmentDto,
  TaxRateSearchQueryDto,
  TaxSetupQueryDto,
  UpdateTaxAccountBindingDto,
  UpdateTaxDefaultPolicyDto,
  UpdateTaxModuleApplicabilityRuleDto,
  UpdateTaxRateDto,
  UpdateTaxRegistrationProfileDto,
  UpdateTaxTreatmentDto,
} from '../dto/tax-setup.dto';
import { TaxSetupService } from '../services/tax-setup.service';

@ApiTags('Tax Setup')
@ApiBearerAuth()
@Controller()
export class TaxSetupController {
  constructor(private readonly taxSetupService: TaxSetupService) {}

  @Get('tax-registration-profile')
  @ApiOperation({ summary: 'Get the organization tax registration profile' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.view')
  async getRegistrationProfile(@CurrentTenant() companyId: string) {
    return new ApiResponseDto(await this.taxSetupService.getRegistrationProfile(companyId));
  }

  @Patch('tax-registration-profile')
  @ApiOperation({ summary: 'Update the organization tax registration profile' })
  @ApiBody({ type: UpdateTaxRegistrationProfileDto })
  @ApiOkResponse({ type: ApiResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiForbiddenResponse({ description: 'Missing permission' })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.manage_registration_profile')
  async updateRegistrationProfile(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTaxRegistrationProfileDto,
  ) {
    return new ApiResponseDto(
      await this.taxSetupService.updateRegistrationProfile(companyId, user.id, dto),
      'tax_setup.registration_profile.updated',
    );
  }

  @Get('tax-rates')
  @ApiOperation({ summary: 'List tax rates for the organization' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.view')
  async listRates(@CurrentTenant() companyId: string, @Query() query: TaxRateSearchQueryDto) {
    return new ApiResponseDto(await this.taxSetupService.listTaxRates(companyId, query));
  }

  @Get('tax-rates/search')
  @ApiOperation({ summary: 'Search tax rates for picker use' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.view')
  async searchRates(@CurrentTenant() companyId: string, @Query() query: TaxRateSearchQueryDto) {
    return new ApiResponseDto(await this.taxSetupService.listTaxRates(companyId, query));
  }

  @Get('tax-rates/:id')
  @ApiOperation({ summary: 'Get a tax rate by ID' })
  @ApiParam({ name: 'id', description: 'Tax rate UUID' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.view')
  async getRate(@CurrentTenant() companyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return new ApiResponseDto(await this.taxSetupService.getTaxRate(companyId, id));
  }

  @Post('tax-rates')
  @ApiOperation({ summary: 'Create a tax rate' })
  @ApiBody({ type: CreateTaxRateDto })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.create_rate')
  async createRate(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaxRateDto,
  ) {
    return new ApiResponseDto(await this.taxSetupService.createTaxRate(companyId, user.id, dto), 'tax_setup.rate.created');
  }

  @Patch('tax-rates/:id')
  @ApiOperation({ summary: 'Update a tax rate' })
  @ApiParam({ name: 'id', description: 'Tax rate UUID' })
  @ApiBody({ type: UpdateTaxRateDto })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.edit_rate')
  async updateRate(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxRateDto,
  ) {
    return new ApiResponseDto(await this.taxSetupService.updateTaxRate(companyId, user.id, id, dto), 'tax_setup.rate.updated');
  }

  @Post('tax-rates/:id/inactivate')
  @ApiOperation({ summary: 'Inactivate a tax rate' })
  @ApiParam({ name: 'id', description: 'Tax rate UUID' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.archive_rate')
  async inactivateRate(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(await this.taxSetupService.inactivateTaxRate(companyId, user.id, id), 'tax_setup.rate.inactivated');
  }

  @Post('tax-rates/:id/archive')
  @ApiOperation({ summary: 'Archive a tax rate' })
  @ApiParam({ name: 'id', description: 'Tax rate UUID' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.archive_rate')
  async archiveRate(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(await this.taxSetupService.archiveTaxRate(companyId, user.id, id), 'tax_setup.rate.archived');
  }

  @Get('tax-treatments')
  @ApiOperation({ summary: 'List tax treatments for the organization' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.view')
  async listTreatments(@CurrentTenant() companyId: string, @Query() query: TaxSetupQueryDto) {
    return new ApiResponseDto(await this.taxSetupService.listTaxTreatments(companyId, query));
  }

  @Get('tax-treatments/search')
  @ApiOperation({ summary: 'Search tax treatments for picker use' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.view')
  async searchTreatments(@CurrentTenant() companyId: string, @Query() query: TaxSetupQueryDto) {
    return new ApiResponseDto(await this.taxSetupService.listTaxTreatments(companyId, query));
  }

  @Get('tax-treatments/:id')
  @ApiOperation({ summary: 'Get a tax treatment by ID' })
  @ApiParam({ name: 'id', description: 'Tax treatment UUID' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.view')
  async getTreatment(@CurrentTenant() companyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return new ApiResponseDto(await this.taxSetupService.getTaxTreatment(companyId, id));
  }

  @Post('tax-treatments')
  @ApiOperation({ summary: 'Create a tax treatment' })
  @ApiBody({ type: CreateTaxTreatmentDto })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.manage_treatments')
  async createTreatment(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaxTreatmentDto,
  ) {
    return new ApiResponseDto(await this.taxSetupService.createTaxTreatment(companyId, user.id, dto), 'tax_setup.treatment.created');
  }

  @Patch('tax-treatments/:id')
  @ApiOperation({ summary: 'Update a tax treatment' })
  @ApiParam({ name: 'id', description: 'Tax treatment UUID' })
  @ApiBody({ type: UpdateTaxTreatmentDto })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.manage_treatments')
  async updateTreatment(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxTreatmentDto,
  ) {
    return new ApiResponseDto(await this.taxSetupService.updateTaxTreatment(companyId, user.id, id, dto), 'tax_setup.treatment.updated');
  }

  @Post('tax-treatments/:id/inactivate')
  @ApiOperation({ summary: 'Inactivate a tax treatment' })
  @ApiParam({ name: 'id', description: 'Tax treatment UUID' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.manage_treatments')
  async inactivateTreatment(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(await this.taxSetupService.inactivateTaxTreatment(companyId, user.id, id), 'tax_setup.treatment.inactivated');
  }

  @Post('tax-treatments/:id/archive')
  @ApiOperation({ summary: 'Archive a tax treatment' })
  @ApiParam({ name: 'id', description: 'Tax treatment UUID' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.manage_treatments')
  async archiveTreatment(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(await this.taxSetupService.archiveTaxTreatment(companyId, user.id, id), 'tax_setup.treatment.archived');
  }

  @Get('tax-default-policy')
  @ApiOperation({ summary: 'Get the default tax policy' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.view')
  async getDefaultPolicy(@CurrentTenant() companyId: string) {
    return new ApiResponseDto(await this.taxSetupService.getDefaultPolicy(companyId));
  }

  @Patch('tax-default-policy')
  @ApiOperation({ summary: 'Update the default tax policy' })
  @ApiBody({ type: UpdateTaxDefaultPolicyDto })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.manage_defaults')
  async updateDefaultPolicy(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTaxDefaultPolicyDto,
  ) {
    return new ApiResponseDto(await this.taxSetupService.updateDefaultPolicy(companyId, user.id, dto), 'tax_setup.default_policy.updated');
  }

  @Get('tax-account-bindings')
  @ApiOperation({ summary: 'Get tax account bindings' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.view')
  async getAccountBinding(@CurrentTenant() companyId: string) {
    return new ApiResponseDto(await this.taxSetupService.getAccountBinding(companyId));
  }

  @Patch('tax-account-bindings')
  @ApiOperation({ summary: 'Update tax account bindings' })
  @ApiBody({ type: UpdateTaxAccountBindingDto })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.manage_account_bindings')
  async updateAccountBinding(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTaxAccountBindingDto,
  ) {
    return new ApiResponseDto(await this.taxSetupService.updateAccountBinding(companyId, user.id, dto), 'tax_setup.account_binding.updated');
  }

  @Get('tax-module-applicability-rules')
  @ApiOperation({ summary: 'List tax module applicability rules' })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.view')
  async listApplicabilityRules(@CurrentTenant() companyId: string) {
    return new ApiResponseDto(await this.taxSetupService.listApplicabilityRules(companyId));
  }

  @Patch('tax-module-applicability-rules/:moduleKey')
  @ApiOperation({ summary: 'Update a tax module applicability rule' })
  @ApiParam({ name: 'moduleKey', enum: TaxModuleKey })
  @ApiBody({ type: UpdateTaxModuleApplicabilityRuleDto })
  @ApiOkResponse({ type: ApiResponseDto })
  @ProtectedRead()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tax_setup.manage_module_applicability')
  async updateApplicabilityRule(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleKey', new ParseEnumPipe(TaxModuleKey)) moduleKey: TaxModuleKey,
    @Body() dto: UpdateTaxModuleApplicabilityRuleDto,
  ) {
    return new ApiResponseDto(await this.taxSetupService.updateApplicabilityRule(companyId, user.id, moduleKey, dto), 'tax_setup.applicability_rule.updated');
  }
}

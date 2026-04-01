// ============================================================
// invoices.controller.ts
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, InvoiceQueryDto, RecordPaymentDto, UpdateInvoiceDto } from './dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  ProtectedRead,
  OwnerOnly,
  StaffWrite,
} from '../../common/decorators/subscription.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FeatureKey } from '../../common/entitlements/feature-catalog';
import {
  CreateInvoiceSwagger,
  CreateFromDeferredSaleSwagger,
  ListInvoicesSwagger,
  GetInvoiceSwagger,
  DeleteInvoiceSwagger,
} from './swagger/invoices.swagger';

@Controller('invoices')
@RequireFeature(FeatureKey.INVOICES_READ)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly t: TranslationService,
  ) {}

  // POST /invoices
  @Post()
  @CreateInvoiceSwagger()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @StaffWrite()
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  @RequirePermissions('createInvoice')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    const data = await this.invoicesService.create(companyId, user.id, dto);
    return new ApiResponseDto(data, this.t.translate('invoices.created'));
  }

  @Post('create-and-approve')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @StaffWrite()
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  @RequirePermissions('createInvoice', 'approveInvoice')
  async createAndApprove(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    const data = await this.invoicesService.createAndApprove(companyId, user.id, dto);
    return new ApiResponseDto(data, this.t.translate('invoices.approved'));
  }

  // POST /invoices/from-deferred-sale/:saleId — declared before /:id
  @Post('from-deferred-sale/:saleId')
  @CreateFromDeferredSaleSwagger()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  @RequirePermissions('createInvoice')
  async createFromDeferredSale(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('saleId', ParseUUIDPipe) saleId: string,
  ) {
    const data = await this.invoicesService.createFromDeferredSale(
      companyId,
      user.id,
      saleId,
    );
    return new ApiResponseDto(data, this.t.translate('invoices.created'));
  }

  // GET /invoices



  // POST /invoices/duplicate/:id — B4: clone as new DRAFT, declared before /:id routes
  @Post('duplicate/:sourceId')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  @RequirePermissions('manageLedger')
  async duplicate(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    const data = await this.invoicesService.duplicate(companyId, user.id, sourceId);
    return new ApiResponseDto(data, this.t.translate('invoices.duplicated'));
  }


  // GET /invoices/customer/:customerId/last — B4: last N invoices for a customer
  @Get('customer/:customerId/last')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewLedger')
  async getLastForCustomer(
    @CurrentTenant() companyId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('limit') limit: string = '3',
  ) {
    const data = await this.invoicesService.getLastInvoicesForCustomer(
      companyId,
      customerId,
      parseInt(limit, 10) || 3,
    );
    return new ApiResponseDto(data);
  }

  @Get()
  @ListInvoicesSwagger()
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewLedger')
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: InvoiceQueryDto,
  ) {
    const data = await this.invoicesService.findAll(companyId, query);
    return new ApiResponseDto(data);
  }

  // GET /invoices/:id
  @Get(':id')
  @GetInvoiceSwagger()
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewLedger')
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.invoicesService.findOne(companyId, id);
    return new ApiResponseDto(data);
  }

  // PATCH /invoices/:id — update DRAFT invoice items/header (B10.2)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  @ProtectedRead()
  @RequirePermissions('editDraft')
  async update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    const data = await this.invoicesService.updateDraft(companyId, user.id, id, dto);
    return new ApiResponseDto(data, this.t.translate('invoices.updated'));
  }

  // PATCH /invoices/:id/submit — DRAFT -> PENDING_APPROVAL (no financial effect)
  @Patch(':id/submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @StaffWrite()
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  @RequirePermissions('createInvoice')
  async submit(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.invoicesService.submit(companyId, user.id, id);
    return new ApiResponseDto(null, this.t.translate('invoices.submitted'));
  }

  // PATCH /invoices/:id/approve — DRAFT|PENDING -> APPROVED (ledger + balance)
  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @StaffWrite()
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  @RequirePermissions('approveInvoice')
  async approve(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.invoicesService.approve(companyId, user.id, id);
    return new ApiResponseDto(null, this.t.translate('invoices.approved'));
  }

  // PATCH /invoices/:id/reject — DRAFT|PENDING -> REJECTED (no financial effect)
  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  @OwnerOnly()
  async reject(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.invoicesService.reject(companyId, user.id, id);
    return new ApiResponseDto(null, this.t.translate('invoices.rejected'));
  }

  // PATCH /invoices/:id/cancel — APPROVED -> CANCELLED (reverses ledger + balance)
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  @OwnerOnly()
  async cancel(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.invoicesService.cancel(companyId, user.id, id);
    return new ApiResponseDto(null, this.t.translate('invoices.cancelled'));
  }

  // POST /invoices/:id/payments — B5: record payment on a specific invoice
  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @StaffWrite()
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  @RequirePermissions('recordPayment')
  async recordPayment(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    await this.invoicesService.recordInvoicePayment(companyId, user.id, id, dto);
    return new ApiResponseDto(null, this.t.translate('invoices.paymentRecorded'));
  }

  // DELETE /invoices/:id — soft-delete DRAFT or REJECTED only
  @Delete(':id')
  @DeleteInvoiceSwagger()
  @HttpCode(HttpStatus.OK)
  @RequireFeature(FeatureKey.INVOICES_MANAGE)
  async remove(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.invoicesService.remove(companyId, user.id, id);
    return new ApiResponseDto(null, this.t.translate('invoices.deleted'));
  }
}

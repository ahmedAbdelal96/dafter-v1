import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  CreateSupplierInvoiceDto,
  PostDocumentDto,
  PurchaseQueryDto,
} from './dto/purchases.dto';
import { SupplierInvoiceService } from './supplier-invoice.service';

@Controller('purchases/supplier-invoices')
export class SupplierInvoiceController {
  constructor(private readonly service: SupplierInvoiceService) {}
  @Get()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSupplierInvoices')
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: PurchaseQueryDto,
  ) {
    return new ApiResponseDto(
      await this.service.findAll(companyId, query.invoiceStatus),
      'Supplier invoices retrieved successfully',
    );
  }
  @Get(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSupplierInvoices')
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.service.findOne(companyId, id),
      'Supplier invoice retrieved successfully',
    );
  }
  @Post()
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageSupplierInvoices')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierInvoiceDto,
  ) {
    return new ApiResponseDto(
      await this.service.createDraft(companyId, user.id, dto),
      'Supplier invoice draft created successfully',
    );
  }
  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageSupplierInvoices')
  async update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSupplierInvoiceDto,
  ) {
    return new ApiResponseDto(
      await this.service.updateDraft(companyId, user.id, id, dto),
      'Supplier invoice draft updated successfully',
    );
  }
  @Post(':id/post')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('postSupplierInvoices')
  async post(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostDocumentDto,
  ) {
    return new ApiResponseDto(
      await this.service.postDraft(
        companyId,
        user.id,
        id,
        new Date(dto.postingDate),
        dto.idempotencyKey,
      ),
      'Supplier invoice posted successfully',
    );
  }
  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageSupplierInvoices')
  async remove(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.service.deleteDraft(companyId, user.id, id),
      'Supplier invoice draft deleted successfully',
    );
  }
}

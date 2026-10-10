import {
  Body,
  Controller,
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
import { CreatePurchaseOrderDto, PurchaseQueryDto } from './dto/purchases.dto';
import { PurchaseOrderService } from './purchase-order.service';

@Controller('purchases/purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly service: PurchaseOrderService) {}
  @Get()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewPurchaseOrders')
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: PurchaseQueryDto,
  ) {
    return new ApiResponseDto(
      await this.service.findAll(companyId, query.status),
      'Purchase orders retrieved successfully',
    );
  }
  @Get(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewPurchaseOrders')
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.service.findOne(companyId, id),
      'Purchase order retrieved successfully',
    );
  }
  @Post()
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('managePurchaseOrders')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return new ApiResponseDto(
      await this.service.createDraft(companyId, user.id, dto),
      'Purchase order draft created successfully',
    );
  }
  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('managePurchaseOrders')
  async update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return new ApiResponseDto(
      await this.service.updateDraft(companyId, user.id, id, dto),
      'Purchase order draft updated successfully',
    );
  }
  @Post(':id/approve')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('approvePurchaseOrders')
  async approve(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.service.approve(companyId, user.id, id),
      'Purchase order approved successfully',
    );
  }
  @Post(':id/cancel')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('managePurchaseOrders')
  async cancel(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.service.cancel(companyId, user.id, id),
      'Purchase order cancelled successfully',
    );
  }
  @Post(':id/convert-to-invoice')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageSupplierInvoices')
  async convert(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.service.convertToInvoice(companyId, user.id, id),
      'Purchase order converted to supplier invoice successfully',
    );
  }
}

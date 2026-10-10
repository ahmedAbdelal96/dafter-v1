import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  CreateSalesInvoiceDto,
  SalesInvoiceQueryDto,
  UpdateSalesInvoiceDto,
  PostSalesInvoiceDto,
} from './dto';
import { SalesInvoiceService } from './sales-invoice.service';

@Controller('sales/invoices')
export class SalesInvoiceController {
  constructor(private readonly salesInvoiceService: SalesInvoiceService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSalesInvoices')
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: SalesInvoiceQueryDto,
  ) {
    const parsed = {
      ...query,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      documentDateFrom: query.documentDateFrom
        ? new Date(query.documentDateFrom)
        : undefined,
      documentDateTo: query.documentDateTo
        ? new Date(query.documentDateTo)
        : undefined,
    };
    const result = await this.salesInvoiceService.findAll(companyId, parsed);
    const response = new ApiResponseDto(
      result.items,
      'Sales invoices retrieved successfully',
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSalesInvoices')
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.salesInvoiceService.findOne(companyId, id),
      'Sales invoice retrieved successfully',
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('createSalesInvoice')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalesInvoiceDto,
  ) {
    return new ApiResponseDto(
      await this.salesInvoiceService.createDraft(companyId, user.id, {
        ...dto,
        documentDate: new Date(dto.documentDate),
      }),
      'Sales invoice draft created successfully',
    );
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('editSalesInvoice')
  async update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesInvoiceDto,
  ) {
    return new ApiResponseDto(
      await this.salesInvoiceService.updateDraft(companyId, user.id, id, {
        ...dto,
        documentDate: new Date(dto.documentDate),
      }),
      'Sales invoice draft updated successfully',
    );
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('postSalesInvoice')
  async post(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostSalesInvoiceDto,
  ) {
    return new ApiResponseDto(
      await this.salesInvoiceService.postDraft(companyId, user.id, id, {
        postingDate: new Date(dto.postingDate),
        idempotencyKey: dto.idempotencyKey,
      }),
      'Sales invoice posted successfully',
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('editSalesInvoice')
  async remove(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.salesInvoiceService.deleteDraft(companyId, user.id, id),
      'Sales invoice draft deleted successfully',
    );
  }
}

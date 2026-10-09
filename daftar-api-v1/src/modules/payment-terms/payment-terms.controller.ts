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
import { UserRole } from '@prisma/client';
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
import { PaymentTermsService } from './payment-terms.service';
import {
  CalculatePaymentTermDto,
  CreatePaymentTermDto,
  PaymentTermQueryDto,
  SetPaymentTermActiveDto,
  UpdatePaymentTermDto,
} from './dto';

const COMPANY_ROLES = [UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN];

@Controller('payment-terms')
export class PaymentTermsController {
  constructor(private readonly paymentTermsService: PaymentTermsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @ProtectedRead(...COMPANY_ROLES)
  @RequirePermissions('viewPartners')
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: PaymentTermQueryDto,
  ) {
    const result = await this.paymentTermsService.findAll(companyId, query);
    const response = new ApiResponseDto(
      result.items,
      'Payment terms retrieved successfully',
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedRead(...COMPANY_ROLES)
  @RequirePermissions('viewPartners')
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.paymentTermsService.findOne(companyId, id),
      'Payment term retrieved successfully',
    );
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentTermDto,
  ) {
    return new ApiResponseDto(
      await this.paymentTermsService.create(companyId, user.id, dto),
      'Payment term created successfully',
    );
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentTermDto,
  ) {
    return new ApiResponseDto(
      await this.paymentTermsService.update(companyId, user.id, id, dto),
      'Payment term updated successfully',
    );
  }

  @Patch(':id/active')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async setActive(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPaymentTermActiveDto,
  ) {
    return new ApiResponseDto(
      await this.paymentTermsService.setActive(
        companyId,
        user.id,
        id,
        dto.isActive,
      ),
      'Payment term status updated successfully',
    );
  }

  @Post(':id/calculate')
  @UseGuards(PermissionsGuard)
  @ProtectedRead(...COMPANY_ROLES)
  @RequirePermissions('viewPartners')
  async calculate(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CalculatePaymentTermDto,
  ) {
    return new ApiResponseDto(
      await this.paymentTermsService.calculate(
        companyId,
        id,
        dto.amount,
        new Date(dto.documentDate),
        dto.currencyCode,
      ),
      'Payment schedule calculated successfully',
    );
  }

  @Post(':id/customer/:partnerId')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async assignCustomer(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
  ) {
    return new ApiResponseDto(
      await this.paymentTermsService.assignCustomer(
        companyId,
        user.id,
        partnerId,
        id,
      ),
      'Payment term assigned to customer successfully',
    );
  }

  @Post(':id/supplier/:partnerId')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async assignSupplier(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
  ) {
    return new ApiResponseDto(
      await this.paymentTermsService.assignSupplier(
        companyId,
        user.id,
        partnerId,
        id,
      ),
      'Payment term assigned to supplier successfully',
    );
  }
}

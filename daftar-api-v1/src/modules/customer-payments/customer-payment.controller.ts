import {
  Body,
  Controller,
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
  CreateCustomerPaymentDto,
  CustomerPaymentQueryDto,
  PostCustomerPaymentDto,
  ReconcileOnAccountDto,
  ReverseCustomerPaymentDto,
  UpdateCustomerPaymentDto,
} from './dto';
import { CustomerPaymentService } from './customer-payment.service';

@Controller('customer-payments')
export class CustomerPaymentController {
  constructor(private readonly service: CustomerPaymentService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewCustomerPayments')
  findAll(
    @CurrentTenant() companyId: string,
    @Query() query: CustomerPaymentQueryDto,
  ) {
    return this.service
      .findAll(companyId, query)
      .then(
        (rows) =>
          new ApiResponseDto(rows, 'Customer payments retrieved successfully'),
      );
  }

  @Get('open-items')
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewCustomerPayments')
  openItems(
    @CurrentTenant() companyId: string,
    @Query('businessPartnerId', ParseUUIDPipe) businessPartnerId: string,
  ) {
    return this.service
      .listOpenItems(companyId, businessPartnerId)
      .then(
        (rows) =>
          new ApiResponseDto(rows, 'AR open items retrieved successfully'),
      );
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewCustomerPayments')
  findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service
      .findOne(companyId, id)
      .then(
        (row) =>
          new ApiResponseDto(row, 'Customer payment retrieved successfully'),
      );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('createCustomerPayment')
  create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerPaymentDto,
  ) {
    return this.service
      .createDraft(companyId, user.id, {
        ...dto,
        paymentDate: new Date(dto.paymentDate),
      })
      .then(
        (row) =>
          new ApiResponseDto(
            row,
            'Customer payment draft created successfully',
          ),
      );
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('editCustomerPayment')
  update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerPaymentDto,
  ) {
    return this.service
      .updateDraft(companyId, user.id, id, {
        ...dto,
        paymentDate: new Date(dto.paymentDate),
      })
      .then(
        (row) =>
          new ApiResponseDto(
            row,
            'Customer payment draft updated successfully',
          ),
      );
  }

  @Post(':id/post')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('postCustomerPayment')
  post(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostCustomerPaymentDto,
  ) {
    return this.service
      .postDraft(
        companyId,
        user.id,
        id,
        new Date(dto.postingDate),
        dto.idempotencyKey,
      )
      .then(
        (row) =>
          new ApiResponseDto(row, 'Customer payment posted successfully'),
      );
  }

  @Post(':id/reverse')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('postCustomerPayment')
  reverse(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseCustomerPaymentDto,
  ) {
    return this.service
      .reverse(
        companyId,
        user.id,
        id,
        new Date(dto.postingDate),
        dto.reason,
        dto.idempotencyKey,
      )
      .then(
        (row) =>
          new ApiResponseDto(row, 'Customer payment reversed successfully'),
      );
  }

  @Post(':id/reconcile')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('postCustomerPayment')
  reconcile(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReconcileOnAccountDto,
  ) {
    return this.service
      .reconcileOnAccount(
        companyId,
        user.id,
        id,
        dto.journalLineId,
        dto.amount,
        dto.idempotencyKey,
      )
      .then(
        (row) =>
          new ApiResponseDto(row, 'On-account amount reconciled successfully'),
      );
  }
}

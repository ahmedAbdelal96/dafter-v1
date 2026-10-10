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
  CreateAPReconciliationDto,
  CreateSupplierPaymentDto,
  SupplierPaymentQueryDto,
  PostSupplierPaymentDto,
  ReconcileOnAccountDto,
  ReverseAPReconciliationDto,
  ReverseSupplierPaymentDto,
  UpdateSupplierPaymentDto,
} from './dto';
import { APReconciliationService } from './ap-reconciliation.service';
import { SupplierPaymentService } from './supplier-payment.service';

@Controller('supplier-payments')
export class SupplierPaymentController {
  constructor(
    private readonly service: SupplierPaymentService,
    private readonly ap: APReconciliationService,
  ) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSupplierPayments')
  findAll(
    @CurrentTenant() companyId: string,
    @Query() query: SupplierPaymentQueryDto,
  ) {
    return this.service
      .findAll(companyId, query)
      .then(
        (rows) =>
          new ApiResponseDto(rows, 'Supplier payments retrieved successfully'),
      );
  }

  @Get('open-items')
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSupplierPayments')
  openItems(
    @CurrentTenant() companyId: string,
    @Query('businessPartnerId', ParseUUIDPipe) businessPartnerId: string,
  ) {
    return this.service
      .listOpenItems(companyId, businessPartnerId)
      .then(
        (rows) =>
          new ApiResponseDto(rows, 'AP open items retrieved successfully'),
      );
  }

  @Post('ap-reconciliations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('reconcileSupplierAP')
  reconcileAP(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAPReconciliationDto,
  ) {
    return this.ap
      .reconcile({
        companyId,
        actorUserId: user.id,
        debitJournalLineId: dto.debitJournalLineId,
        creditJournalLineId: dto.creditJournalLineId,
        transactionAmount: dto.amount,
        idempotencyKey: dto.idempotencyKey,
        postingDate: new Date(dto.postingDate),
      })
      .then(
        (row) =>
          new ApiResponseDto(row, 'AP reconciliation created successfully'),
      );
  }

  @Post('ap-reconciliations/:id/reverse')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('reconcileSupplierAP')
  reverseAP(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseAPReconciliationDto,
  ) {
    return this.ap
      .reverse({
        companyId,
        actorUserId: user.id,
        reconciliationId: id,
        postingDate: new Date(dto.postingDate),
        reason: dto.reason,
        idempotencyKey: dto.idempotencyKey,
      })
      .then(
        (row) =>
          new ApiResponseDto(row, 'AP reconciliation reversed successfully'),
      );
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSupplierPayments')
  findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service
      .findOne(companyId, id)
      .then(
        (row) =>
          new ApiResponseDto(row, 'Supplier payment retrieved successfully'),
      );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('createSupplierPayment')
  create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierPaymentDto,
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
            'Supplier payment draft created successfully',
          ),
      );
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('editSupplierPayment')
  update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierPaymentDto,
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
            'Supplier payment draft updated successfully',
          ),
      );
  }

  @Post(':id/post')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('postSupplierPayment')
  post(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostSupplierPaymentDto,
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
          new ApiResponseDto(row, 'Supplier payment posted successfully'),
      );
  }

  @Post(':id/reverse')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('reverseSupplierPayments')
  reverse(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseSupplierPaymentDto,
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
          new ApiResponseDto(row, 'Supplier payment reversed successfully'),
      );
  }

  @Post(':id/reconcile')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('reconcileSupplierAP')
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
        dto.postingDate ? new Date(dto.postingDate) : undefined,
      )
      .then(
        (row) =>
          new ApiResponseDto(row, 'On-account amount reconciled successfully'),
      );
  }
}

// ============================================================
// PaymentsController — Fast Payment Recording
// ============================================================
//
// Routes:
//   POST /payments              — standalone payment (no specific invoice)
//   POST /payments/distribute   — distribute across a customer's open invoices
//
// Both endpoints create LedgerEntry + decrement Balance atomically.
// ============================================================

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { StandalonePaymentDto, DistributePaymentDto } from './dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ProtectedWrite } from '../../common/decorators/subscription.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { FeatureKey } from '../../common/entitlements/feature-catalog';

@Controller('payments')
@RequireFeature(FeatureKey.INVOICES_MANAGE)
export class PaymentsController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly t: TranslationService,
  ) {}

  // POST /payments — standalone payment (not linked to a specific invoice)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('recordPayment')
  async recordStandalonePayment(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StandalonePaymentDto,
  ) {
    await this.invoicesService.recordStandalonePayment(
      companyId,
      user.id,
      dto,
    );
    return new ApiResponseDto(
      null,
      this.t.translate('invoices.paymentRecorded'),
    );
  }

  // POST /payments/distribute — distribute across a customer's open invoices
  @Post('distribute')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('recordPayment')
  async distributePayment(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DistributePaymentDto,
  ) {
    const result = await this.invoicesService.distributePayment(
      companyId,
      user.id,
      dto,
    );
    return new ApiResponseDto(
      result,
      this.t.translate('invoices.paymentDistributed'),
    );
  }
}

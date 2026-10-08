// ============================================
// installments.controller.ts
// ============================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import {
  CreateContractDto,
  RecordInstallmentPaymentDto,
  QueryContractsDto,
  QueryScheduleDto,
} from './dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  OwnerOnly,
  ProtectedRead,
  ProtectedWrite,
} from '../../common/decorators/subscription.decorator';

import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { FeatureKey } from '../../common/entitlements/feature-catalog';
import {
  InstallmentsApiTags,
  CreateContractSwagger,
  RecordPaymentSwagger,
  CancelContractSwagger,
  GetContractSwagger,
  ListContractsSwagger,
  GetScheduleSwagger,
} from './swagger/installments.swagger';

@Controller('installments')

@RequireFeature(FeatureKey.INSTALLMENTS_READ)
export class InstallmentsController {
  constructor(
    private readonly installmentsService: InstallmentsService,
    private readonly t: TranslationService,
  ) {}

  // Ã¢â€â‚¬Ã¢â€â‚¬ POST /installments/contracts Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Post('contracts')
  @CreateContractSwagger()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  
  @RequireFeature(FeatureKey.INSTALLMENTS_MANAGE)
  @RequirePermissions('manageInstallments')
  async createContract(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContractDto,
  ) {
    const data = await this.installmentsService.createContract(
      companyId,
      user.id,
      dto,
    );
    return new ApiResponseDto(
      data,
      this.t.translate('installments.create.success'),
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /installments/contracts Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // NOTE: This route MUST be declared before /contracts/:id
  //       to prevent NestJS from treating "contracts" path-segment as :id param.
  @Get('contracts')
  @ListContractsSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewInstallments')
  async listContracts(
    @CurrentTenant() companyId: string,
    @Query() query: QueryContractsDto,
  ) {
    const result = await this.installmentsService.findAll(companyId, query);
    const response = new ApiResponseDto(
      result.items,
      this.t.translate('installments.list.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /installments/schedule Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // NOTE: Declared before /contracts/:id to avoid routing conflicts.
  @Get('schedule')
  @GetScheduleSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewInstallments')
  async getSchedule(
    @CurrentTenant() companyId: string,
    @Query() query: QueryScheduleDto,
  ) {
    const result = await this.installmentsService.getSchedule(companyId, query);
    const response = new ApiResponseDto(
      result.items,
      this.t.translate('installments.schedule.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /installments/contracts/:id Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Get('contracts/:id')
  @GetContractSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewInstallments')
  async getContract(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includePayments') includePayments?: string,
  ) {
    const data = await this.installmentsService.findOne(
      companyId,
      id,
      includePayments === 'true',
    );
    return new ApiResponseDto(data, this.t.translate('installments.get.success'));
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ POST /installments/contracts/:id/payments Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Post('contracts/:id/payments')
  @RecordPaymentSwagger()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  
  @RequireFeature(FeatureKey.INSTALLMENTS_MANAGE)
  @RequirePermissions('manageInstallments')
  async recordPayment(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordInstallmentPaymentDto,
  ) {
    const data = await this.installmentsService.recordPayment(
      companyId,
      id,
      user.id,
      dto,
    );
    return new ApiResponseDto(
      data,
      this.t.translate('installments.payment.success'),
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ PATCH /installments/contracts/:id/cancel Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Patch('contracts/:id/cancel')
  @CancelContractSwagger()
  @HttpCode(HttpStatus.OK)
  @RequireFeature(FeatureKey.INSTALLMENTS_MANAGE)
   // Ã˜Â­Ã˜ÂµÃ˜Â±Ã™Å  Ã™â€žÃ™â€žÃ™â‚¬ Owner Ã¢â‚¬â€ Ã™â€žÃ˜Â§ Ã™Å Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ @RequirePermissions
  async cancelContract(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.installmentsService.cancelContract(companyId, id, user.id);
    return new ApiResponseDto(
      null,
      this.t.translate('installments.cancel.success'),
    );
  }
}


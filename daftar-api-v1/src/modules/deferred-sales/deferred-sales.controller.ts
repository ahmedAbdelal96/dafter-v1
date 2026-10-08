// ============================================
// deferred-sales.controller.ts
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
import { DeferredSalesService } from './deferred-sales.service';
import {
  CreateDeferredSaleDto,
  RecordDeferredPaymentDto,
  QueryDeferredSaleDto,
} from './dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  ProtectedRead,
  ProtectedWrite,
  OwnerOnly,
} from '../../common/decorators/subscription.decorator';

import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { FeatureKey } from '../../common/entitlements/feature-catalog';
import {
  DeferredSalesApiTags,
  CreateDeferredSaleSwagger,
  ListDeferredSalesSwagger,
  GetDeferredSaleSwagger,
  RecordPaymentSwagger,
  CancelDeferredSaleSwagger,
} from './swagger/deferred-sales.swagger';

@Controller('deferred-sales')

@RequireFeature(FeatureKey.DEFERRED_SALES_READ)
export class DeferredSalesController {
  constructor(
    private readonly deferredSalesService: DeferredSalesService,
    private readonly t: TranslationService,
  ) {}

  // Ã¢â€â‚¬Ã¢â€â‚¬ POST /deferred-sales Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /**
   * Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â¨Ã™Å Ã˜Â¹ Ã˜Â¢Ã˜Â¬Ã™â€ž Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯
   *
   * @param companyId - Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã™â€¦Ã™â€  JWT (CurrentTenant)
   * @param user - Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â§Ã˜Â¯Ã™â€š Ã˜Â¹Ã™â€žÃ™Å Ã™â€¡ (CurrentUser)
   * @param dto - Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¢Ã˜Â¬Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯
   * @returns Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¢Ã˜Â¬Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜Â´Ã˜Â£ Ã™â€¦Ã˜ÂºÃ™â€žÃ™Å½Ã™â€˜Ã™Â Ã™ÂÃ™Å  ApiResponseDto
   */
  @Post()
  @CreateDeferredSaleSwagger()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  
  @RequireFeature(FeatureKey.DEFERRED_SALES_MANAGE)
  @RequirePermissions('manageInstallments')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeferredSaleDto,
  ) {
    const data = await this.deferredSalesService.create(
      companyId,
      user.id,
      dto,
    );
    return new ApiResponseDto(
      data,
      this.t.translate('deferred-sales.create.success'),
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /deferred-sales Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /**
   * Ã˜Â¬Ã™â€žÃ˜Â¨ Ã™â€šÃ˜Â§Ã˜Â¦Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¢Ã˜Â¬Ã™â€žÃ˜Â© Ã™â€¦Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜ÂµÃ™ÂÃ™Å Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂµÃ™ÂÃ˜Â­Ã˜Â§Ã˜Âª
   *
   * @param companyId - Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã™â€¦Ã™â€  JWT (CurrentTenant)
   * @param query - Ã™â€¦Ã˜Â¹Ã˜Â§Ã™â€¦Ã™â€žÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ˜ÂµÃ™ÂÃ™Å Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂµÃ™ÂÃ˜Â­Ã˜Â§Ã˜Âª
   * @returns Ã™â€šÃ˜Â§Ã˜Â¦Ã™â€¦Ã˜Â© Ã™â€¦Ã™ÂÃ˜ÂµÃ™ÂÃ™Å½Ã™â€˜Ã˜Â­Ã˜Â© Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¢Ã˜Â¬Ã™â€žÃ˜Â© Ã™â€¦Ã˜ÂºÃ™â€žÃ™Å½Ã™â€˜Ã™ÂÃ˜Â© Ã™ÂÃ™Å  ApiResponseDto
   */
  @Get()
  @ListDeferredSalesSwagger()
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewInstallments')
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: QueryDeferredSaleDto,
  ) {
    const data = await this.deferredSalesService.findAll(companyId, query);
    return new ApiResponseDto(data, this.t.translate('common.success'));
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /deferred-sales/:id Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /**
   * Ã˜Â¬Ã™â€žÃ˜Â¨ Ã˜ÂªÃ™ÂÃ˜Â§Ã˜ÂµÃ™Å Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â¹ Ã˜Â¢Ã˜Â¬Ã™â€ž Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯ Ã™â€¦Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¯Ã™ÂÃ˜Â¹Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â±Ã™Â
   *
   * @param companyId - Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã™â€¦Ã™â€  JWT (CurrentTenant)
   * @param id - Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¢Ã˜Â¬Ã™â€ž (UUID Ã¢â‚¬â€ Ã™â€¦Ã™ÂÃ˜ÂªÃ˜Â­Ã™â€šÃ™Å½Ã™â€˜Ã™â€š Ã™â€¦Ã™â€ Ã™â€¡ Ã˜Â¨Ã™â‚¬ ParseUUIDPipe)
   * @returns Ã˜ÂªÃ™ÂÃ˜Â§Ã˜ÂµÃ™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¢Ã˜Â¬Ã™â€ž Ã™â€¦Ã˜ÂºÃ™â€žÃ™Å½Ã™â€˜Ã™ÂÃ˜Â© Ã™ÂÃ™Å  ApiResponseDto
   */
  @Get(':id')
  @GetDeferredSaleSwagger()
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewInstallments')
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.deferredSalesService.findOne(companyId, id);
    return new ApiResponseDto(data, this.t.translate('common.success'));
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ POST /deferred-sales/:id/payments Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /**
   * Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â¯Ã™ÂÃ˜Â¹Ã˜Â© Ã˜Â¬Ã˜Â²Ã˜Â¦Ã™Å Ã˜Â© Ã˜Â£Ã™Ë† Ã™Æ’Ã˜Â§Ã™â€¦Ã™â€žÃ˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â¨Ã™Å Ã˜Â¹ Ã˜Â¢Ã˜Â¬Ã™â€ž
   *
   * @param companyId - Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã™â€¦Ã™â€  JWT (CurrentTenant)
   * @param user - Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â§Ã˜Â¯Ã™â€š Ã˜Â¹Ã™â€žÃ™Å Ã™â€¡ (CurrentUser)
   * @param id - Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¢Ã˜Â¬Ã™â€ž (UUID Ã¢â‚¬â€ Ã™â€¦Ã™ÂÃ˜ÂªÃ˜Â­Ã™â€šÃ™Å½Ã™â€˜Ã™â€š Ã™â€¦Ã™â€ Ã™â€¡ Ã˜Â¨Ã™â‚¬ ParseUUIDPipe)
   * @param dto - Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¯Ã™ÂÃ˜Â¹Ã˜Â©
   * @returns Ã˜Â§Ã™â€žÃ˜Â¯Ã™ÂÃ˜Â¹Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¢Ã˜Â¬Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜Â¯Ã™Å½Ã™â€˜Ã˜Â« Ã™â€¦Ã˜ÂºÃ™â€žÃ™Å½Ã™â€˜Ã™ÂÃ™Å½Ã™Å Ã™â€  Ã™ÂÃ™Å  ApiResponseDto
   */
  @Post(':id/payments')
  @RecordPaymentSwagger()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  
  @RequireFeature(FeatureKey.DEFERRED_SALES_MANAGE)
  @RequirePermissions('manageInstallments')
  async recordPayment(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordDeferredPaymentDto,
  ) {
    const data = await this.deferredSalesService.recordPayment(
      companyId,
      user.id,
      id,
      dto,
    );
    return new ApiResponseDto(
      data,
      this.t.translate('deferred-sales.payment.success'),
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ PATCH /deferred-sales/:id/cancel Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /**
   * Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡ Ã˜Â¨Ã™Å Ã˜Â¹ Ã˜Â¢Ã˜Â¬Ã™â€ž (Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’ Ã™ÂÃ™â€šÃ˜Â·)
   *
   * Ã™Å Ã˜Â¹Ã™Æ’Ã˜Â³ Ã˜Â§Ã™â€žÃ˜Â±Ã˜ÂµÃ™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â¨Ã™â€šÃ™Å  Ã™ÂÃ™â€šÃ˜Â· (Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¨Ã™â€žÃ˜Âº Ã˜ÂºÃ™Å Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜Â¯Ã™Å½Ã™â€˜Ã˜Â¯).
   *
   * @param companyId - Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã™â€¦Ã™â€  JWT (CurrentTenant)
   * @param user - Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â§Ã˜Â¯Ã™â€š Ã˜Â¹Ã™â€žÃ™Å Ã™â€¡ (CurrentUser)
   * @param id - Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¢Ã˜Â¬Ã™â€ž (UUID Ã¢â‚¬â€ Ã™â€¦Ã™ÂÃ˜ÂªÃ˜Â­Ã™â€šÃ™Å½Ã™â€˜Ã™â€š Ã™â€¦Ã™â€ Ã™â€¡ Ã˜Â¨Ã™â‚¬ ParseUUIDPipe)
   * @returns Ã˜Â±Ã˜Â³Ã˜Â§Ã™â€žÃ˜Â© Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­ Ã™â€¦Ã˜ÂºÃ™â€žÃ™Å½Ã™â€˜Ã™ÂÃ˜Â© Ã™ÂÃ™Å  ApiResponseDto
   */
  @Patch(':id/cancel')
  @CancelDeferredSaleSwagger()
  @HttpCode(HttpStatus.OK)
  @RequireFeature(FeatureKey.DEFERRED_SALES_MANAGE)
  
  async cancel(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.deferredSalesService.cancel(companyId, user.id, id);
    return new ApiResponseDto(
      null,
      this.t.translate('deferred-sales.cancel.success'),
    );
  }
}


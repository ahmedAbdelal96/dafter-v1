// ============================================================
// PricingController — Customer-Specific Product Pricing
// ============================================================
// B6.3 GET  /pricing/customer/:customerId/product/:productId
// B6.4 PUT  /pricing/customer/:customerId/product/:productId
// ============================================================

import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PricingService } from './pricing.service';
import { SetCustomerPriceDto } from './dto';
import { ApiResponseDto } from '../../common/dto';
import { TranslationService } from '../../common/services/translation.service';
import type { AuthenticatedUser } from '../../common/types';
import {
  CurrentUser,
  CurrentTenant,
  ProtectedWrite,
  ProtectedRead,
} from '../../common/decorators';

@ApiTags('Pricing')
@ApiBearerAuth()
@Controller('pricing')
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly t: TranslationService,
  ) {}

    // ── GET /pricing/customer/:customerId ─────────────────────────────────────
  @Get('customer/:customerId')
  @ApiOperation({ summary: 'List all custom prices set for a specific customer' })
  @ApiParam({ name: 'customerId', type: String, format: 'uuid' })
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
  async listCustomerPrices(
    @CurrentTenant() companyId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    const data = await this.pricingService.listCustomerPrices(companyId, customerId);
    return new ApiResponseDto(data, this.t.translate('pricing.list.success'));
  }

  // ── GET /pricing/customer/:customerId/product/:productId ──────────────────
  @Get('customer/:customerId/product/:productId')
  @ApiOperation({ summary: 'Get suggested price for a product when selling to a specific customer' })
  @ApiParam({ name: 'customerId', type: String, format: 'uuid' })
  @ApiParam({ name: 'productId', type: String, format: 'uuid' })
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
  async getCustomerPrice(
    @CurrentTenant() companyId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const data = await this.pricingService.getCustomerPrice(companyId, customerId, productId);
    return new ApiResponseDto(data, this.t.translate('pricing.get.success'));
  }

  // ── PUT /pricing/customer/:customerId/product/:productId ──────────────────
  @Put('customer/:customerId/product/:productId')
  @ApiOperation({ summary: 'Set a custom price for a product when selling to a specific customer' })
  @ApiParam({ name: 'customerId', type: String, format: 'uuid' })
  @ApiParam({ name: 'productId', type: String, format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  @ProtectedWrite(UserRole.OWNER, UserRole.STAFF)
  async setCustomerPrice(
    @CurrentTenant() companyId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetCustomerPriceDto,
  ) {
    const data = await this.pricingService.setCustomerPrice(
      companyId,
      customerId,
      productId,
      dto,
      actor.id,
    );
    return new ApiResponseDto(data, this.t.translate('pricing.set.success'));
  }
}

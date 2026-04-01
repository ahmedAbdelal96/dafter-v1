// ============================================
// products.controller.ts
// ============================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto';
import { ApiResponseDto } from '../../common/dto';
import { TranslationService } from '../../common/services/translation.service';
import type { AuthenticatedUser } from '../../common/types';
import {
  CurrentUser,
  CurrentTenant,
  ProtectedWrite,
  ProtectedRead,
  OwnerOnly,
  RequirePermissions,
} from '../../common/decorators';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { FeatureKey } from '../../common/entitlements/feature-catalog';
import {
  ProductsApiTags,
  CreateProductSwagger,
  ListProductsSwagger,
  GetProductSwagger,
  UpdateProductSwagger,
  DeleteProductSwagger,
} from './swagger/products.swagger';

@Controller('products')

@RequireFeature(FeatureKey.PRODUCTS_READ)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly t: TranslationService,
  ) {}

  // Ã¢â€â‚¬Ã¢â€â‚¬ POST /products Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  @Post()
  @CreateProductSwagger()
  @ProtectedWrite(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequireFeature(FeatureKey.PRODUCTS_MANAGE)
  @RequirePermissions('manageParties')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    const data = await this.productsService.create(companyId, user.id, dto);
    return new ApiResponseDto(
      data,
      this.t.translate('products.create.success'),
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /products Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  @Get()
  @ListProductsSwagger()
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewParties')
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: QueryProductDto,
  ) {
    const data = await this.productsService.findAll(companyId, query);
    return new ApiResponseDto(data);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /products/:id Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬


  // -- GET /products/search --------------------------------------------------
  // Declared BEFORE /:id to prevent routing conflict with ParseUUIDPipe

  @Get('search')
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewParties')
  async search(
    @CurrentTenant() companyId: string,
    @Query('q') q: string = '',
    @Query('limit') limit: string = '10',
  ) {
    const data = await this.productsService.search(
      companyId,
      q ?? '',
      parseInt(limit, 10) || 10,
    );
    return new ApiResponseDto(data);
  }


  // -- GET /products/recent --------------------------------------------------
  // Declared BEFORE /:id to prevent routing conflict with ParseUUIDPipe

  @Get('recent')
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewParties')
  async getRecentProducts(
    @CurrentTenant() companyId: string,
    @Query('limit') limit: string = '10',
  ) {
    const data = await this.productsService.getRecentProducts(
      companyId,
      parseInt(limit, 10) || 10,
    );
    return new ApiResponseDto(data);
  }


  // -- GET /products/:id/last-price ------------------------------------------

  @Get(':id/last-price')
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewParties')
  async getLastPrice(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('customerId', ParseUUIDPipe) customerId: string,
  ) {
    const data = await this.productsService.getLastPrice(companyId, id, customerId);
    return new ApiResponseDto(data);
  }

  @Get(':id')
  @GetProductSwagger()
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequirePermissions('viewParties')
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.productsService.findOne(companyId, id);
    return new ApiResponseDto(data);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ PATCH /products/:id Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  @Patch(':id')
  @UpdateProductSwagger()
  @HttpCode(HttpStatus.OK)
  @ProtectedWrite(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @RequireFeature(FeatureKey.PRODUCTS_MANAGE)
  @RequirePermissions('manageParties')
  async update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const data = await this.productsService.update(companyId, user.id, id, dto);
    return new ApiResponseDto(
      data,
      this.t.translate('products.update.success'),
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ DELETE /products/:id Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  @Delete(':id')
  @DeleteProductSwagger()
  @HttpCode(HttpStatus.OK)
  @OwnerOnly()
  @RequireFeature(FeatureKey.PRODUCTS_MANAGE)
  async remove(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.productsService.remove(companyId, user.id, id);
    return new ApiResponseDto(
      null,
      this.t.translate('products.delete.success'),
    );
  }

}


// ============================================
// customers.controller.ts
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
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
import {
  OwnerOnly,
  ProtectedRead,
  ProtectedWrite,
} from '../../common/decorators/subscription.decorator';

import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { FeatureKey } from '../../common/entitlements/feature-catalog';
import {
  CustomersApiTags,
  CreateCustomerSwagger,
  ListCustomersSwagger,
  GetCustomerSwagger,
  UpdateCustomerSwagger,
  DeleteCustomerSwagger,
} from './swagger/customers.swagger';

@Controller('customers')

@RequireFeature(FeatureKey.CUSTOMERS_READ)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly t: TranslationService,
  ) {}

  // Ã¢â€â‚¬Ã¢â€â‚¬ POST /customers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Post()
  @CreateCustomerSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequireFeature(FeatureKey.CUSTOMERS_MANAGE)
  @RequirePermissions('manageParties') // STAFF Ã™Å Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â‚¬ flag Ã¢â‚¬â€ OWNER Ã™Å Ã˜ÂªÃ˜Â®Ã˜Â·Ã™â€˜Ã˜Â§Ã™â€¡
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
  ) {
    const data = await this.customersService.create(companyId, user.id, dto);
    return new ApiResponseDto(
      data,
      this.t.translate('customers.create.success'),
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /customers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Get()
  @ListCustomersSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewParties') // STAFF Ã™Å Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â‚¬ flag Ã¢â‚¬â€ OWNER Ã™Å Ã˜ÂªÃ˜Â®Ã˜Â·Ã™â€˜Ã˜Â§Ã™â€¡
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: CustomerQueryDto,
  ) {
    const result = await this.customersService.findAll(companyId, query);
    const response = new ApiResponseDto(
      result.items,
      this.t.translate('customers.list.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  // -- GET /customers/overdue — B7.2+B7.3 — must be BEFORE /:id route --------
  @Get('overdue')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewReports')
  async listOverdue(
    @CurrentTenant() companyId: string,
    @Query('sort') sort: 'amount' | 'age' = 'amount',
    @Query('limit') limit: string = '20',
  ) {
    const data = await this.customersService.listOverdue(
      companyId,
      sort === 'age' ? 'age' : 'amount',
      this.parseOverdueLimit(limit),
    );
    return new ApiResponseDto(data, this.t.translate('customers.overdue.success'));
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ GET /customers/:id Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // GET /customers/:id/snapshot — declared before /:id to prevent routing conflict
  @Get(':id/snapshot')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewCustomerBalances')
  async getSnapshot(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.customersService.getSnapshot(companyId, id);
    return new ApiResponseDto(data, this.t.translate('customers.snapshot.success'));
  }

    @Get(':id')
  @GetCustomerSwagger()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewParties') // STAFF Ã™Å Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â‚¬ flag Ã¢â‚¬â€ OWNER Ã™Å Ã˜ÂªÃ˜Â®Ã˜Â·Ã™â€˜Ã˜Â§Ã™â€¡
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.customersService.findOne(companyId, id);
    return new ApiResponseDto(data, this.t.translate('customers.get.success'));
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ PATCH /customers/:id Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Patch(':id')
  @UpdateCustomerSwagger()
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequireFeature(FeatureKey.CUSTOMERS_MANAGE)
  @RequirePermissions('manageParties') // STAFF Ã™Å Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â‚¬ flag Ã¢â‚¬â€ OWNER Ã™Å Ã˜ÂªÃ˜Â®Ã˜Â·Ã™â€˜Ã˜Â§Ã™â€¡
  async update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const data = await this.customersService.update(
      companyId,
      user.id,
      id,
      dto,
    );
    return new ApiResponseDto(
      data,
      this.t.translate('customers.update.success'),
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ DELETE /customers/:id Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @Delete(':id')
  @DeleteCustomerSwagger()
  @HttpCode(HttpStatus.OK)
  @OwnerOnly()
  @RequireFeature(FeatureKey.CUSTOMERS_MANAGE)
   // Ã˜Â­Ã˜ÂµÃ˜Â±Ã™Å  Ã™â€žÃ™â€žÃ™â‚¬ Owner Ã¢â‚¬â€ Ã™â€žÃ˜Â§ Ã™Å Ã˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ @RequirePermissions
  async remove(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.customersService.remove(companyId, user.id, id);
    return new ApiResponseDto(
      data,
      this.t.translate('customers.delete.success'),
    );
  }

  // -- GET /customers/:id/frequent-products ----------------------------------
  // Declared with /:id pattern - safe because snapshot is already above

  @Get(':id/frequent-products')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewParties')
  async getFrequentProducts(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit: string = '8',
  ) {
    const data = await this.customersService.getFrequentProducts(
      companyId,
      id,
      this.parseFrequentProductsLimit(limit),
    );
    return new ApiResponseDto(data);
  }

  private parseOverdueLimit(limit: string): number {
    return Math.min(this.parseLimitOrDefault(limit, 20), 100);
  }

  private parseFrequentProductsLimit(limit: string): number {
    return this.parseLimitOrDefault(limit, 8);
  }

  private parseLimitOrDefault(limit: string, fallback: number): number {
    return parseInt(limit, 10) || fallback;
  }

}


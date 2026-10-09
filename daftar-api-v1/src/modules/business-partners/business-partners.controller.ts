import {
  Body,
  Controller,
  Delete,
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
import { BusinessPartnersService } from './business-partners.service';
import {
  BusinessPartnerAddressDto,
  BusinessPartnerContactDto,
  BusinessPartnerQueryDto,
  CreateBusinessPartnerDto,
  SetBusinessPartnerActiveDto,
  SupplierProfileInputDto,
  CustomerProfileInputDto,
  UpdateBusinessPartnerAddressDto,
  UpdateBusinessPartnerContactDto,
  UpdateBusinessPartnerDto,
  UpdateCustomerProfileDto,
  UpdateSupplierProfileDto,
} from './dto';

const COMPANY_ROLES = [UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN];

@Controller('business-partners')
export class BusinessPartnersController {
  constructor(
    private readonly businessPartnersService: BusinessPartnersService,
  ) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @ProtectedRead(...COMPANY_ROLES)
  @RequirePermissions('viewPartners')
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: BusinessPartnerQueryDto,
  ) {
    const result = await this.businessPartnersService.findAll(companyId, query);
    const response = new ApiResponseDto(
      result.items,
      'Business partners retrieved successfully',
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
      await this.businessPartnersService.findOne(companyId, id),
      'Business partner retrieved successfully',
    );
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBusinessPartnerDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.create(companyId, user.id, dto),
      'Business partner created successfully',
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
    @Body() dto: UpdateBusinessPartnerDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.update(companyId, user.id, id, dto),
      'Business partner updated successfully',
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
    @Body() dto: SetBusinessPartnerActiveDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.setActive(
        companyId,
        user.id,
        id,
        dto.isActive,
        dto.version,
      ),
      'Business partner status updated successfully',
    );
  }

  @Post(':id/customer-profile')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async addCustomerProfile(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CustomerProfileInputDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.addCustomerProfile(
        companyId,
        user.id,
        id,
        dto,
      ),
      'Customer role added successfully',
    );
  }

  @Patch(':id/customer-profile')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async updateCustomerProfile(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.updateCustomerProfile(
        companyId,
        user.id,
        id,
        dto,
      ),
      'Customer role updated successfully',
    );
  }

  @Delete(':id/customer-profile')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async removeCustomerProfile(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.removeCustomerProfile(
        companyId,
        user.id,
        id,
      ),
      'Customer role removed successfully',
    );
  }

  @Post(':id/supplier-profile')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async addSupplierProfile(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SupplierProfileInputDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.addSupplierProfile(
        companyId,
        user.id,
        id,
        dto,
      ),
      'Supplier role added successfully',
    );
  }

  @Patch(':id/supplier-profile')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async updateSupplierProfile(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierProfileDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.updateSupplierProfile(
        companyId,
        user.id,
        id,
        dto,
      ),
      'Supplier role updated successfully',
    );
  }

  @Delete(':id/supplier-profile')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async removeSupplierProfile(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.removeSupplierProfile(
        companyId,
        user.id,
        id,
      ),
      'Supplier role removed successfully',
    );
  }

  @Post(':id/addresses')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async addAddress(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BusinessPartnerAddressDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.addAddress(
        companyId,
        user.id,
        id,
        dto,
      ),
      'Partner address added successfully',
    );
  }

  @Patch(':id/addresses/:addressId')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async updateAddress(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateBusinessPartnerAddressDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.updateAddress(
        companyId,
        user.id,
        id,
        addressId,
        dto,
      ),
      'Partner address updated successfully',
    );
  }

  @Delete(':id/addresses/:addressId')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async removeAddress(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.removeAddress(
        companyId,
        user.id,
        id,
        addressId,
      ),
      'Partner address removed successfully',
    );
  }

  @Post(':id/contacts')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async addContact(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BusinessPartnerContactDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.addContact(
        companyId,
        user.id,
        id,
        dto,
      ),
      'Partner contact added successfully',
    );
  }

  @Patch(':id/contacts/:contactId')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async updateContact(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateBusinessPartnerContactDto,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.updateContact(
        companyId,
        user.id,
        id,
        contactId,
        dto,
      ),
      'Partner contact updated successfully',
    );
  }

  @Delete(':id/contacts/:contactId')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite(...COMPANY_ROLES)
  @RequirePermissions('managePartners')
  async removeContact(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return new ApiResponseDto(
      await this.businessPartnersService.removeContact(
        companyId,
        user.id,
        id,
        contactId,
      ),
      'Partner contact removed successfully',
    );
  }
}

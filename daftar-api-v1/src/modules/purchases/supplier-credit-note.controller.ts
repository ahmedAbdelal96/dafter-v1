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
  CreateSupplierCreditNoteDto,
  PostDocumentDto,
  PurchaseQueryDto,
} from './dto/purchases.dto';
import { SupplierCreditNoteService } from './supplier-credit-note.service';

@Controller('purchases/supplier-credit-notes')
export class SupplierCreditNoteController {
  constructor(private readonly service: SupplierCreditNoteService) {}
  @Get()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSupplierCreditNotes')
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: PurchaseQueryDto,
  ) {
    return new ApiResponseDto(
      await this.service.findAll(companyId, query.creditNoteStatus),
      'Supplier credit notes retrieved successfully',
    );
  }
  @Get(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSupplierCreditNotes')
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.service.findOne(companyId, id),
      'Supplier credit note retrieved successfully',
    );
  }
  @Post()
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageSupplierCreditNotes')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierCreditNoteDto,
  ) {
    return new ApiResponseDto(
      await this.service.createDraft(companyId, user.id, dto),
      'Supplier credit note draft created successfully',
    );
  }
  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('manageSupplierCreditNotes')
  async update(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSupplierCreditNoteDto,
  ) {
    return new ApiResponseDto(
      await this.service.updateDraft(companyId, user.id, id, dto),
      'Supplier credit note draft updated successfully',
    );
  }
  @Post(':id/post')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('postSupplierCreditNotes')
  async post(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostDocumentDto,
  ) {
    return new ApiResponseDto(
      await this.service.postDraft(
        companyId,
        user.id,
        id,
        new Date(dto.postingDate),
        dto.idempotencyKey,
      ),
      'Supplier credit note posted successfully',
    );
  }
}

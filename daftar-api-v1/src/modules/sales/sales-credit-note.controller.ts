import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { CreateSalesCreditNoteDto, SalesCreditNoteQueryDto } from './dto';
import { SalesCreditNoteService } from './sales-credit-note.service';

@Controller('sales/credit-notes')
export class SalesCreditNoteController {
  constructor(private readonly service: SalesCreditNoteService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSalesCreditNotes')
  async findAll(
    @CurrentTenant() companyId: string,
    @Query() query: SalesCreditNoteQueryDto,
  ) {
    return new ApiResponseDto(
      await this.service.findAll(companyId, query),
      'Sales credit notes retrieved successfully',
    );
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @ProtectedRead()
  @RequirePermissions('viewSalesCreditNotes')
  async findOne(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.service.findOne(companyId, id),
      'Sales credit note retrieved successfully',
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('createSalesCreditNote')
  async create(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalesCreditNoteDto,
  ) {
    return new ApiResponseDto(
      await this.service.createDraft(companyId, user.id, {
        ...dto,
        documentDate: new Date(dto.documentDate),
      }),
      'Sales credit note draft created successfully',
    );
  }

  @Post(':id/post')
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('postSalesCreditNote')
  async post(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.service.postDraft(companyId, user.id, id),
      'Sales credit note posted successfully',
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedWrite()
  @RequirePermissions('editSalesCreditNote')
  async remove(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return new ApiResponseDto(
      await this.service.deleteDraft(companyId, user.id, id),
      'Sales credit note draft deleted successfully',
    );
  }
}

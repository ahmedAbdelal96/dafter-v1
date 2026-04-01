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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { OwnerOnly, ProtectedRead } from '../../common/decorators/subscription.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { TranslationService } from '../../common/services/translation.service';
import { CashReconciliationService } from './cash-reconciliation.service';
import { UpsertDailyReconciliationDto } from './dto/upsert-daily-reconciliation.dto';
import { UpdateDailyReconciliationDto } from './dto/update-daily-reconciliation.dto';
import { GetDailyReconciliationQueryDto } from './dto/get-daily-reconciliation.query.dto';
import { CashReconciliationHistoryQueryDto } from './dto/cash-reconciliation-history.query.dto';
import { CashReconciliationSummaryQueryDto } from './dto/cash-reconciliation-summary.query.dto';

@ApiTags('Cash Reconciliation')
@ApiBearerAuth()
@Controller('cash-reconciliation')
export class CashReconciliationController {
  constructor(
    private readonly service: CashReconciliationService,
    private readonly t: TranslationService,
  ) {}

  @Get('daily')
  @ProtectedRead()
  @ApiOperation({
    summary: 'Get daily cash reconciliation by business date',
  })
  @HttpCode(HttpStatus.OK)
  async getDaily(
    @CurrentTenant() companyId: string,
    @Query() query: GetDailyReconciliationQueryDto,
  ) {
    const data = await this.service.getDaily(companyId, query.businessDate);
    return new ApiResponseDto(data, this.t.translate('cashReconciliation.daily.getSuccess'));
  }

  @Get('daily/history')
  @ProtectedRead()
  @ApiOperation({
    summary: 'List daily cash reconciliation records',
  })
  @HttpCode(HttpStatus.OK)
  async getHistory(
    @CurrentTenant() companyId: string,
    @Query() query: CashReconciliationHistoryQueryDto,
  ) {
    const result = await this.service.getHistory({
      companyId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    const response = new ApiResponseDto(
      result.items,
      this.t.translate('cashReconciliation.daily.historySuccess'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('daily/:id')
  @ProtectedRead()
  @ApiOperation({
    summary: 'Get daily cash reconciliation record by id',
  })
  @HttpCode(HttpStatus.OK)
  async getDailyById(
    @CurrentTenant() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.service.getById(companyId, id);
    return new ApiResponseDto(data, this.t.translate('cashReconciliation.daily.getSuccess'));
  }

  @Get('summary')
  @ProtectedRead()
  @ApiOperation({
    summary: 'Get operational cash reconciliation summary',
  })
  @HttpCode(HttpStatus.OK)
  async getSummary(
    @CurrentTenant() companyId: string,
    @Query() query: CashReconciliationSummaryQueryDto,
  ) {
    const data = await this.service.getSummary(companyId, query.dateFrom, query.dateTo);
    return new ApiResponseDto(data, this.t.translate('cashReconciliation.summary.getSuccess'));
  }

  @Post('daily/draft')
  @OwnerOnly()
  @ApiOperation({
    summary: 'Create daily draft or return existing draft for date',
  })
  @HttpCode(HttpStatus.OK)
  async upsertDraft(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertDailyReconciliationDto,
  ) {
    const data = await this.service.upsertDraft(companyId, user.id, dto);
    const message = data.created
      ? this.t.translate('cashReconciliation.daily.created')
      : this.t.translate('cashReconciliation.daily.existingDraftReturned');
    return new ApiResponseDto(data, message);
  }

  @Patch('daily/:id/draft')
  @OwnerOnly()
  @ApiOperation({
    summary: 'Update a daily draft reconciliation record',
  })
  @HttpCode(HttpStatus.OK)
  async updateDraft(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDailyReconciliationDto,
  ) {
    const data = await this.service.updateDraft(companyId, id, user.id, dto);
    return new ApiResponseDto(data, this.t.translate('cashReconciliation.daily.updated'));
  }

  @Patch('daily/:id/close')
  @OwnerOnly()
  @ApiOperation({
    summary: 'Close a daily reconciliation draft',
  })
  @HttpCode(HttpStatus.OK)
  async closeDraft(
    @CurrentTenant() companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.service.closeDraft(companyId, id, user.id);
    return new ApiResponseDto(data, this.t.translate('cashReconciliation.daily.closed'));
  }
}

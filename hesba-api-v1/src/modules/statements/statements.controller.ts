// ============================================================
// StatementsController — Customer Account Statement (B8.x)
// ============================================================
// GET /statements/:customerId
//   - Opening balance (before dateFrom)
//   - Chronological ledger transactions
//   - Running balance per entry
//   - Overdue flag per entry (when dueDate is passed + unpaid)
//   - Closing balance
//   - Supports optional dateFrom / dateTo query params
// ============================================================

import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { StatementsService } from './statements.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ProtectedRead } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Statements')
@ApiBearerAuth()
@Controller('statements')
export class StatementsController {
  constructor(
    private readonly statementsService: StatementsService,
    private readonly t: TranslationService,
  ) {}

  @Get(':customerId')
  @ApiOperation({ summary: 'Get customer account statement with running balance' })
  @ApiParam({ name: 'customerId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, example: '2026-01-01' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, example: '2026-03-31' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
  @RequirePermissions('viewLedger')
  async getStatement(
    @CurrentTenant() companyId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.statementsService.getCustomerStatement(
      companyId,
      customerId,
      dateFrom,
      dateTo,
    );
    return new ApiResponseDto(data, this.t.translate('statements.get.success'));
  }
}

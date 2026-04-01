import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { NoSubscriptionCheck } from '../../common/decorators/subscription.decorator';
import { TranslationService } from '../../common/services/translation.service';
import { QueryPlatformAuditLogsDto, QueryPlatformAuditLookupsDto } from './dto';
import { PlatformAuditService } from './platform-audit.service';
import {
  GetPlatformAuditLookupsSwagger,
  ListPlatformAuditLogsSwagger,
  PlatformAuditApiTags,
} from './swagger/platform-audit.swagger';

@Controller('platform')
@PlatformAuditApiTags()
export class PlatformAuditController {
  constructor(
    private readonly platformAuditService: PlatformAuditService,
    private readonly t: TranslationService,
  ) {}

  @Get('audit-logs')
  @ListPlatformAuditLogsSwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAuditLogs(@Query() query: QueryPlatformAuditLogsDto) {
    const result = await this.platformAuditService.getAuditLogs(query);
    const response = new ApiResponseDto(
      result.items,
      this.t.translate('platform.audit.list.success'),
    );
    (response as any).meta = result.meta;
    return response;
  }

  @Get('audit-logs/lookups')
  @GetPlatformAuditLookupsSwagger()
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAuditLookups(@Query() query: QueryPlatformAuditLookupsDto) {
    const data = await this.platformAuditService.getAuditLookups(query);
    return new ApiResponseDto(
      data,
      this.t.translate('platform.audit.lookups.success'),
    );
  }
}


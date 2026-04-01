// ============================================================
// AuditController — B10.3
// GET /audit — list audit log entries for the authenticated company
// Filters: entity, entityId, actorId, action
// ============================================================

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { TranslationService } from '../../common/services/translation.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ProtectedRead } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly t: TranslationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List audit log entries — filter by entity, entityId, actor, action' })
  @HttpCode(HttpStatus.OK)
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
  @UseGuards(PermissionsGuard)
  @RequirePermissions('viewReports')
  async list(
    @CurrentTenant() companyId: string,
    @Query() query: AuditQueryDto,
  ) {
    const data = await this.auditService.list(companyId, query);
    return new ApiResponseDto(data, this.t.translate('audit.list.success'));
  }
}

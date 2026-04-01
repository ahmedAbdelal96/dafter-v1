import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { TranslationService } from '../../../common/services/translation.service';
import { QueryPlatformAuditLogsDto } from '../dto';
import { PlatformAuditRepository } from '../platform-audit.repository';

@Injectable()
export class GetPlatformAuditLogsUseCase {
  private readonly logger = new Logger(GetPlatformAuditLogsUseCase.name);

  constructor(
    private readonly repository: PlatformAuditRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(query: QueryPlatformAuditLogsDto) {
    const fromDate = query.fromDate ? this.toBoundaryDate(query.fromDate, 'start') : undefined;
    const toDate = query.toDate ? this.toBoundaryDate(query.toDate, 'end') : undefined;

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        this.t.translate('platform.audit.list.invalidDateRange'),
      );
    }

    try {
      return await this.repository.findAuditLogs({
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        search: query.search,
        companyId: query.companyId,
        actorUserId: query.actorUserId,
        action: query.action,
        entityType: query.entityType,
        fromDate,
        toDate,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
    } catch (error) {
      this.logger.error(
        `Failed to list platform audit logs: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        this.t.translate('platform.audit.list.failed'),
      );
    }
  }

  private toBoundaryDate(input: string, boundary: 'start' | 'end'): Date {
    // If user sends date-only (YYYY-MM-DD), normalize to full-day boundaries.
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input);
    const date = isDateOnly
      ? new Date(`${input}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`)
      : new Date(input);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        this.t.translate('platform.audit.list.invalidDateRange'),
      );
    }

    return date;
  }
}

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryOperationalPerformanceDto } from '../../../dto/query-operational-performance.dto';
import { endOfDay, startOfDay } from '../../shared/date';

@Injectable()
export class GetOperationalPerformanceUseCase {
  private readonly logger = new Logger(GetOperationalPerformanceUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, query: QueryOperationalPerformanceDto) {
    const today = startOfDay(new Date());
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const from = query.dateFrom
      ? startOfDay(new Date(query.dateFrom))
      : startOfDay(firstDayOfMonth);
    const to = query.dateTo ? endOfDay(new Date(query.dateTo)) : endOfDay(today);

    if (from > to) {
      throw new BadRequestException(
        this.t.translate('reports.operationalPerformance.invalidDateRange'),
      );
    }

    this.logger.log(
      `GetOperationalPerformance: companyId=${companyId} | from=${from.toISOString()} | to=${to.toISOString()}`,
    );

    return this.repo.getOperationalPerformance(companyId, {
      dateFrom: from,
      dateTo: to,
      comparePrevious: query.comparePrevious ?? true,
    });
  }
}


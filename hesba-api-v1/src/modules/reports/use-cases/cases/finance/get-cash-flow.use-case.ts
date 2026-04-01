import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryCashFlowDto } from '../../../dto/query-cash-flow.dto';
import { endOfDay, startOfDay } from '../../shared/date';

@Injectable()
export class GetCashFlowUseCase {
  private readonly logger = new Logger(GetCashFlowUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, query: QueryCashFlowDto) {
    const today = startOfDay(new Date());
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const from = query.dateFrom
      ? startOfDay(new Date(query.dateFrom))
      : startOfDay(firstDayOfMonth);
    const to = query.dateTo ? endOfDay(new Date(query.dateTo)) : endOfDay(today);

    if (from > to) {
      throw new BadRequestException(
        this.t.translate('reports.cashFlow.invalidDateRange'),
      );
    }

    this.logger.log(
      `GetCashFlow: companyId=${companyId} | from=${from.toISOString()} | to=${to.toISOString()} | page=${query.page ?? 1} | limit=${query.limit ?? 10}`,
    );

    return this.repo.getCashFlow(companyId, {
      dateFrom: from,
      dateTo: to,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortOrder: query.sortOrder ?? 'desc',
    });
  }
}


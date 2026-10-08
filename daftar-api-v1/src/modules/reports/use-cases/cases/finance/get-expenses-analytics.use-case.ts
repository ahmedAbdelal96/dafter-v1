import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryExpensesAnalyticsDto } from '../../../dto/query-expenses-analytics.dto';
import { endOfDay, startOfDay } from '../../shared/date';

@Injectable()
export class GetExpensesAnalyticsUseCase {
  private readonly logger = new Logger(GetExpensesAnalyticsUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, query: QueryExpensesAnalyticsDto) {
    const today = startOfDay(new Date());
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const from = query.dateFrom
      ? startOfDay(new Date(query.dateFrom))
      : startOfDay(firstDayOfMonth);
    const to = query.dateTo ? endOfDay(new Date(query.dateTo)) : endOfDay(today);

    if (from > to) {
      throw new BadRequestException(
        this.t.translate('reports.expensesAnalytics.invalidDateRange'),
      );
    }

    this.logger.log(
      `GetExpensesAnalytics: companyId=${companyId} | from=${from.toISOString()} | to=${to.toISOString()}`,
    );

    return this.repo.getExpensesAnalytics(companyId, {
      dateFrom: from,
      dateTo: to,
      category: query.category,
      supplierId: query.supplierId,
      search: query.search,
      comparePrevious: query.comparePrevious ?? true,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortOrder: query.sortOrder ?? 'desc',
    });
  }
}


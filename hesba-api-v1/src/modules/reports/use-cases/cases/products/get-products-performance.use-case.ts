import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryProductsPerformanceDto } from '../../../dto/query-products-performance.dto';
import { endOfDay, startOfDay } from '../../shared/date';

@Injectable()
export class GetProductsPerformanceUseCase {
  private readonly logger = new Logger(GetProductsPerformanceUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, query: QueryProductsPerformanceDto) {
    const from = query.dateFrom ? startOfDay(new Date(query.dateFrom)) : undefined;
    const to = query.dateTo ? endOfDay(new Date(query.dateTo)) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException(
        this.t.translate('reports.productsPerformance.invalidDateRange'),
      );
    }

    this.logger.log(
      `GetProductsPerformance: companyId=${companyId} | page=${query.page ?? 1} | limit=${query.limit ?? 10}`,
    );

    return this.repo.getProductsPerformance(companyId, {
      dateFrom: from,
      dateTo: to,
      search: query.search,
      isActive: query.isActive,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortBy: query.sortBy ?? 'salesAmount',
      sortOrder: query.sortOrder ?? 'desc',
    });
  }
}


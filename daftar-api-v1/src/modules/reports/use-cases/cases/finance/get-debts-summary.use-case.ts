import { Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { QueryDebtsSummaryDto } from '../../../dto/query-debts-summary.dto';

@Injectable()
export class GetDebtsSummaryUseCase {
  private readonly logger = new Logger(GetDebtsSummaryUseCase.name);

  constructor(private readonly repo: ReportsRepository) {}

  async execute(companyId: string, query: QueryDebtsSummaryDto) {
    this.logger.log(
      `GetDebtsSummary: companyId=${companyId} | page=${query.page ?? 1} | limit=${query.limit ?? 10}`,
    );

    return this.repo.getDebtsSummary(companyId, {
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortBy: query.sortBy ?? 'amount',
      sortOrder: query.sortOrder ?? 'desc',
      entityType: query.entityType,
      balanceType: query.balanceType,
      search: query.search,
      isActive: query.isActive,
      minAmount: query.minAmount,
    });
  }
}


import { Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { QueryAgingDto } from '../../../dto/query-aging.dto';

@Injectable()
export class GetSuppliersAgingUseCase {
  private readonly logger = new Logger(GetSuppliersAgingUseCase.name);

  constructor(private readonly repo: ReportsRepository) {}

  async execute(companyId: string, query: QueryAgingDto) {
    this.logger.log(
      `GetSuppliersAging: companyId=${companyId} | asOfDate=${query.asOfDate ?? 'today'} | page=${query.page ?? 1} | limit=${query.limit ?? 10}`,
    );

    return this.repo.getPartyAging(companyId, 'SUPPLIER', {
      asOfDate: query.asOfDate ? new Date(query.asOfDate) : new Date(),
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortBy: query.sortBy ?? 'totalOutstanding',
      sortOrder: query.sortOrder ?? 'desc',
      search: query.search,
      isActive: query.isActive,
    });
  }
}


import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QuerySalesDetailedDto } from '../../../dto/query-sales-detailed.dto';
import { endOfDay, startOfDay } from '../../shared/date';

@Injectable()
export class GetSalesDetailedUseCase {
  private readonly logger = new Logger(GetSalesDetailedUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, query: QuerySalesDetailedDto) {
    const from = query.dateFrom ? startOfDay(new Date(query.dateFrom)) : undefined;
    const to = query.dateTo ? endOfDay(new Date(query.dateTo)) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException(
        this.t.translate('reports.salesDetailed.invalidDateRange'),
      );
    }

    this.logger.log(
      `GetSalesDetailed: companyId=${companyId} | page=${query.page ?? 1} | limit=${query.limit ?? 10}`,
    );

    return this.repo.getSalesDetailed(companyId, {
      dateFrom: from,
      dateTo: to,
      partyType: query.partyType,
      partyId: query.partyId,
      createdById: query.createdById,
      saleType: query.saleType,
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortBy: query.sortBy ?? 'issueDate',
      sortOrder: query.sortOrder ?? 'desc',
    });
  }
}


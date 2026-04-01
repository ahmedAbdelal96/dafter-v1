import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryCollectionsFollowupDto } from '../../../dto/query-collections-followup.dto';
import { endOfDay, startOfDay } from '../../shared/date';

@Injectable()
export class GetCollectionsFollowupUseCase {
  private readonly logger = new Logger(GetCollectionsFollowupUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, query: QueryCollectionsFollowupDto) {
    const today = startOfDay(new Date());
    const from = query.dateFrom ? startOfDay(new Date(query.dateFrom)) : today;
    const to = query.dateTo ? endOfDay(new Date(query.dateTo)) : endOfDay(today);

    if (from > to) {
      throw new BadRequestException(
        this.t.translate('reports.collectionsFollowup.invalidDateRange'),
      );
    }

    this.logger.log(
      `GetCollectionsFollowup: companyId=${companyId} | from=${from.toISOString()} | to=${to.toISOString()}`,
    );

    return this.repo.getCollectionsFollowup(companyId, {
      dateFrom: from,
      dateTo: to,
      partyType: query.partyType,
      partyId: query.partyId,
      search: query.search,
      flow: query.flow,
      metric: query.metric,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortOrder: query.sortOrder ?? 'asc',
    });
  }
}

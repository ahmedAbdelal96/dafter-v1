import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryLedgerReportDto } from '../../../dto/query-ledger-report.dto';
import { endOfDay, startOfDay } from '../../shared/date';

@Injectable()
export class GetLedgerStatementReportUseCase {
  private readonly logger = new Logger(GetLedgerStatementReportUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, query: QueryLedgerReportDto) {
    const from = query.dateFrom ? startOfDay(new Date(query.dateFrom)) : undefined;
    const to = query.dateTo ? endOfDay(new Date(query.dateTo)) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException(
        this.t.translate('reports.ledgerStatement.invalidDateRange'),
      );
    }

    this.logger.log(
      `GetLedgerStatementReport: companyId=${companyId} | partyType=${query.partyType} | partyId=${query.partyId}`,
    );

    return this.repo.getLedgerStatementReport(companyId, {
      partyType: query.partyType,
      partyId: query.partyId,
      dateFrom: from,
      dateTo: to,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }
}


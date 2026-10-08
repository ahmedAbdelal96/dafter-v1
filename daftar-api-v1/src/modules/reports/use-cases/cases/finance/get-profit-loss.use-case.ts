import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { TranslationService } from '../../../../../common/services/translation.service';
import { QueryProfitLossDto } from '../../../dto/query-profit-loss.dto';
import { endOfDay, startOfDay } from '../../shared/date';

@Injectable()
export class GetProfitLossUseCase {
  private readonly logger = new Logger(GetProfitLossUseCase.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, query: QueryProfitLossDto) {
    const today = startOfDay(new Date());
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const from = query.dateFrom
      ? startOfDay(new Date(query.dateFrom))
      : startOfDay(firstDayOfMonth);
    const to = query.dateTo ? endOfDay(new Date(query.dateTo)) : endOfDay(today);

    if (from > to) {
      throw new BadRequestException(
        this.t.translate('reports.profitLoss.invalidDateRange'),
      );
    }

    this.logger.log(
      `GetProfitLoss: companyId=${companyId} | from=${from.toISOString()} | to=${to.toISOString()} | compare=${query.comparePrevious ?? true}`,
    );

    return this.repo.getProfitLoss(companyId, {
      dateFrom: from,
      dateTo: to,
      comparePrevious: query.comparePrevious ?? true,
    });
  }
}


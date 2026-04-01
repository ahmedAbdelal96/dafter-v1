import { Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from '../../../reports.repository';
import { QueryCriticalAlertsDto } from '../../../dto/query-critical-alerts.dto';
import { endOfDay } from '../../shared/date';

@Injectable()
export class GetCriticalAlertsUseCase {
  private readonly logger = new Logger(GetCriticalAlertsUseCase.name);

  constructor(private readonly repo: ReportsRepository) {}

  async execute(companyId: string, query: QueryCriticalAlertsDto) {
    const asOfDate = query.asOfDate
      ? endOfDay(new Date(query.asOfDate))
      : endOfDay(new Date());

    this.logger.log(
      `GetCriticalAlerts: companyId=${companyId} | asOfDate=${asOfDate.toISOString()} | limit=${query.limit ?? 10}`,
    );

    return this.repo.getCriticalAlerts(companyId, {
      asOfDate,
      creditUsageThresholdPercent: query.creditUsageThresholdPercent ?? 80,
      largeOverdueAmount: query.largeOverdueAmount ?? 5000,
      upcomingInstallmentsDays: query.upcomingInstallmentsDays ?? 7,
      limit: query.limit ?? 10,
    });
  }
}


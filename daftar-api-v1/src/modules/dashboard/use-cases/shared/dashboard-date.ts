import { BadRequestException } from '@nestjs/common';
import { TranslationService } from '../../../../common/services/translation.service';
import {
  DashboardChartGranularity,
  DashboardPeriodPreset,
  QueryDashboardAlertsDto,
  QueryDashboardChartsDto,
  QueryDashboardDto,
  QueryDashboardHighlightsDto,
} from '../../dto/query-dashboard.dto';
import { endOfDay, startOfDay } from '../../../reports/use-cases/shared/date';

export interface DashboardDateRange {
  dateFrom: Date;
  dateTo: Date;
  preset: DashboardPeriodPreset | 'custom';
}

export type DashboardDateQuery =
  | QueryDashboardDto
  | QueryDashboardChartsDto
  | QueryDashboardHighlightsDto
  | QueryDashboardAlertsDto;

export function resolveDashboardDateRange(
  query: DashboardDateQuery,
  t: TranslationService,
): DashboardDateRange {
  if (query.dateFrom || query.dateTo) {
    if (!query.dateFrom || !query.dateTo) {
      throw new BadRequestException(t.translate('dashboard.common.missingDateRange'));
    }

    const dateFrom = startOfDay(new Date(query.dateFrom));
    const dateTo = endOfDay(new Date(query.dateTo));

    if (dateFrom.getTime() > dateTo.getTime()) {
      throw new BadRequestException(t.translate('dashboard.common.invalidDateRange'));
    }

    return { dateFrom, dateTo, preset: 'custom' };
  }

  const now = new Date();
  const today = startOfDay(now);
  const preset = query.preset ?? DashboardPeriodPreset.MONTH;

  switch (preset) {
    case DashboardPeriodPreset.TODAY:
      return {
        dateFrom: today,
        dateTo: endOfDay(now),
        preset,
      };
    case DashboardPeriodPreset.WEEK: {
      const firstDay = startOfDay(new Date(now));
      const day = firstDay.getDay();
      const diff = day === 0 ? 6 : day - 1;
      firstDay.setDate(firstDay.getDate() - diff);
      return {
        dateFrom: firstDay,
        dateTo: endOfDay(now),
        preset,
      };
    }
    case DashboardPeriodPreset.YEAR:
      return {
        dateFrom: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        dateTo: endOfDay(now),
        preset,
      };
    case DashboardPeriodPreset.LAST_30_DAYS: {
      const from = startOfDay(new Date(now));
      from.setDate(from.getDate() - 29);
      return {
        dateFrom: from,
        dateTo: endOfDay(now),
        preset,
      };
    }
    case DashboardPeriodPreset.MONTH:
    default:
      return {
        dateFrom: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        dateTo: endOfDay(now),
        preset: DashboardPeriodPreset.MONTH,
      };
  }
}

export function resolveChartGranularity(
  range: DashboardDateRange,
  granularity?: DashboardChartGranularity,
): DashboardChartGranularity.DAY | DashboardChartGranularity.MONTH {
  if (granularity && granularity !== DashboardChartGranularity.AUTO) {
    return granularity;
  }

  const days = Math.ceil(
    (range.dateTo.getTime() - range.dateFrom.getTime()) / (1000 * 60 * 60 * 24),
  );

  return days > 62
    ? DashboardChartGranularity.MONTH
    : DashboardChartGranularity.DAY;
}

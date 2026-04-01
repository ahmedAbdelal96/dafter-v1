import { BadRequestException } from '@nestjs/common';
import { TranslationService } from '../../../../common/services/translation.service';
import {
  PlatformDashboardChartGranularity,
  PlatformDashboardPeriodPreset,
  QueryPlatformDashboardChartsDto,
  QueryPlatformDashboardDto,
  QueryPlatformDashboardHealthDto,
} from '../../dto/query-platform-dashboard.dto';
import { endOfDay, startOfDay } from '../../../reports/use-cases/shared/date';

export interface PlatformDashboardDateRange {
  dateFrom: Date;
  dateTo: Date;
  preset: PlatformDashboardPeriodPreset | 'custom';
}

export type PlatformDashboardDateQuery =
  | QueryPlatformDashboardDto
  | QueryPlatformDashboardChartsDto
  | QueryPlatformDashboardHealthDto;

export function resolvePlatformDashboardDateRange(
  query: PlatformDashboardDateQuery,
  t: TranslationService,
): PlatformDashboardDateRange {
  if (query.dateFrom || query.dateTo) {
    if (!query.dateFrom || !query.dateTo) {
      throw new BadRequestException(
        t.translate('platformDashboard.common.missingDateRange'),
      );
    }

    const dateFrom = startOfDay(new Date(query.dateFrom));
    const dateTo = endOfDay(new Date(query.dateTo));

    if (dateFrom.getTime() > dateTo.getTime()) {
      throw new BadRequestException(
        t.translate('platformDashboard.common.invalidDateRange'),
      );
    }

    return { dateFrom, dateTo, preset: 'custom' };
  }

  const now = new Date();
  const today = startOfDay(now);
  const preset = query.preset ?? PlatformDashboardPeriodPreset.MONTH;

  switch (preset) {
    case PlatformDashboardPeriodPreset.TODAY:
      return { dateFrom: today, dateTo: endOfDay(now), preset };
    case PlatformDashboardPeriodPreset.WEEK: {
      const firstDay = startOfDay(new Date(now));
      const day = firstDay.getDay();
      const diff = day === 0 ? 6 : day - 1;
      firstDay.setDate(firstDay.getDate() - diff);
      return { dateFrom: firstDay, dateTo: endOfDay(now), preset };
    }
    case PlatformDashboardPeriodPreset.YEAR:
      return {
        dateFrom: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        dateTo: endOfDay(now),
        preset,
      };
    case PlatformDashboardPeriodPreset.LAST_30_DAYS: {
      const from = startOfDay(new Date(now));
      from.setDate(from.getDate() - 29);
      return { dateFrom: from, dateTo: endOfDay(now), preset };
    }
    case PlatformDashboardPeriodPreset.MONTH:
    default:
      return {
        dateFrom: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        dateTo: endOfDay(now),
        preset: PlatformDashboardPeriodPreset.MONTH,
      };
  }
}

export function resolvePlatformChartGranularity(
  range: PlatformDashboardDateRange,
  granularity?: PlatformDashboardChartGranularity,
): PlatformDashboardChartGranularity.DAY | PlatformDashboardChartGranularity.MONTH {
  if (granularity && granularity !== PlatformDashboardChartGranularity.AUTO) {
    return granularity;
  }

  const days = Math.ceil(
    (range.dateTo.getTime() - range.dateFrom.getTime()) / (1000 * 60 * 60 * 24),
  );

  return days > 62
    ? PlatformDashboardChartGranularity.MONTH
    : PlatformDashboardChartGranularity.DAY;
}

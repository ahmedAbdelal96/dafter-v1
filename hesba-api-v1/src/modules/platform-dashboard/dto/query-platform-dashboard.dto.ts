import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum PlatformDashboardPeriodPreset {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  LAST_30_DAYS = 'last30days',
}

export enum PlatformDashboardChartGranularity {
  AUTO = 'auto',
  DAY = 'day',
  MONTH = 'month',
}

export class QueryPlatformDashboardDto {
  @ApiPropertyOptional({
    enum: PlatformDashboardPeriodPreset,
    default: PlatformDashboardPeriodPreset.MONTH,
    description:
      'Named period preset. Ignored when dateFrom/dateTo are provided explicitly.',
  })
  @IsOptional()
  @IsEnum(PlatformDashboardPeriodPreset)
  preset?: PlatformDashboardPeriodPreset = PlatformDashboardPeriodPreset.MONTH;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Start date in YYYY-MM-DD format.',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-03-31',
    description: 'End date in YYYY-MM-DD format.',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class QueryPlatformDashboardChartsDto extends QueryPlatformDashboardDto {
  @ApiPropertyOptional({
    enum: PlatformDashboardChartGranularity,
    default: PlatformDashboardChartGranularity.AUTO,
    description: 'Controls chart bucket size.',
  })
  @IsOptional()
  @IsEnum(PlatformDashboardChartGranularity)
  granularity?: PlatformDashboardChartGranularity =
    PlatformDashboardChartGranularity.AUTO;
}

export class QueryPlatformDashboardHealthDto extends QueryPlatformDashboardDto {
  @ApiPropertyOptional({
    example: 6,
    minimum: 3,
    maximum: 12,
    default: 6,
    description: 'Maximum number of rows to return per health section.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(12)
  limit?: number = 6;
}

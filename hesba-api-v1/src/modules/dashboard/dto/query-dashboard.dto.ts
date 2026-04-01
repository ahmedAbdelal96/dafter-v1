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

export enum DashboardPeriodPreset {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  LAST_30_DAYS = 'last30days',
}

export enum DashboardChartGranularity {
  AUTO = 'auto',
  DAY = 'day',
  MONTH = 'month',
}

export class QueryDashboardDto {
  @ApiPropertyOptional({
    enum: DashboardPeriodPreset,
    default: DashboardPeriodPreset.MONTH,
    description:
      'Named period preset. Ignored when dateFrom/dateTo are provided explicitly.',
  })
  @IsOptional()
  @IsEnum(DashboardPeriodPreset)
  preset?: DashboardPeriodPreset = DashboardPeriodPreset.MONTH;

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

export class QueryDashboardChartsDto extends QueryDashboardDto {
  @ApiPropertyOptional({
    enum: DashboardChartGranularity,
    default: DashboardChartGranularity.AUTO,
    description: 'Controls chart bucket size.',
  })
  @IsOptional()
  @IsEnum(DashboardChartGranularity)
  granularity?: DashboardChartGranularity = DashboardChartGranularity.AUTO;
}

export class QueryDashboardHighlightsDto extends QueryDashboardDto {
  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: 10,
    default: 5,
    description: 'Top entities to return per section.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}

export class QueryDashboardAlertsDto extends QueryDashboardDto {
  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
    description: 'Maximum alert items to return.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

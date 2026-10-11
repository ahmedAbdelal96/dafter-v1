import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum DashboardPreset { TODAY = 'today', WEEK = 'week', MONTH = 'month', YEAR = 'year', LAST_30_DAYS = 'last30days' }
export enum DashboardGranularity { AUTO = 'auto', DAY = 'day', MONTH = 'month' }

export class DashboardQueryDto {
  @IsOptional() @IsEnum(DashboardPreset) preset?: DashboardPreset;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsEnum(DashboardGranularity) granularity?: DashboardGranularity;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

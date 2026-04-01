import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class QueryCriticalAlertsDto {
  @ApiPropertyOptional({
    description: 'Reference date for alerts (YYYY-MM-DD). Defaults to today.',
    example: '2026-03-04',
  })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiPropertyOptional({
    description: 'Credit utilization threshold percentage.',
    example: 80,
    default: 80,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  creditUsageThresholdPercent?: number = 80;

  @ApiPropertyOptional({
    description: 'Minimum overdue amount to flag large overdue records.',
    example: 5000,
    default: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  largeOverdueAmount?: number = 5000;

  @ApiPropertyOptional({
    description: 'Future window for upcoming installment dues.',
    example: 7,
    default: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  upcomingInstallmentsDays?: number = 7;

  @ApiPropertyOptional({
    description: 'Number of rows per alert section.',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}


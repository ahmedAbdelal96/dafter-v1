import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProfitLossDto {
  @ApiPropertyOptional({
    description: 'Start date for report period (YYYY-MM-DD). Defaults to first day of current month.',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date for report period (YYYY-MM-DD). Defaults to today.',
    example: '2026-03-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description:
      'Whether to include previous-period comparison. Defaults to true.',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  comparePrevious?: boolean = true;
}


import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCashFlowDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Start date for cash flow period (YYYY-MM-DD). Defaults to first day of current month.',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date for cash flow period (YYYY-MM-DD). Defaults to today.',
    example: '2026-03-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}


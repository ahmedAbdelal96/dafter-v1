import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAgingDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Aging reference date (YYYY-MM-DD). Defaults to today. Buckets are computed against this date.',
    example: '2026-03-04',
  })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiPropertyOptional({
    description: 'Search by party name or phone.',
    example: 'ahmed',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active/inactive status.',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}


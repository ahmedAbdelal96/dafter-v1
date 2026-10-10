import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory } from '@prisma/client';

export class QueryExpenseDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  /** Filter by category */
  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  /** ISO date — start of date range (inclusive) */
  @IsString()
  @IsOptional()
  dateFrom?: string;

  /** ISO date — end of date range (inclusive) */
  @IsString()
  @IsOptional()
  dateTo?: string;

  /** Full-text search on description and referenceNumber */
  @IsString()
  @IsOptional()
  search?: string;
}

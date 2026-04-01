// ============================================
// DTO: Query Reports — Filters for Summary & Overdue
// ============================================
// Used in:
//   GET /reports/summary  — partyType, dateFrom, dateTo
//   GET /reports/overdue  — partyType, partyId, minDaysOverdue + pagination
// ============================================

import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartyType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryReportsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'تصفية حسب نوع الطرف',
    enum: PartyType,
    example: PartyType.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(PartyType)
  partyType?: PartyType;

  @ApiPropertyOptional({
    description: 'معرف الطرف (UUID) — للتصفية على طرف بعينه',
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  @IsOptional()
  @IsUUID('4')
  partyId?: string;

  @ApiPropertyOptional({
    description: 'تاريخ البداية لتصفية createdAt (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'تاريخ النهاية لتصفية createdAt (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'بحث نصي (اسم الطرف أو رقم المرجع)',
    example: 'محمد',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'الحد الأدنى لأيام التأخر (افتراضي: 1)',
    example: 1,
    minimum: 0,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minDaysOverdue?: number = 1;
}

// ============================================
// DTO: Query Collection Schedule
// ============================================
// Used in: GET /reports/collection-schedule
//
// dateFrom and dateTo are REQUIRED for this endpoint.
// They define the date range for upcoming payments to show.
// ============================================

import {
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartyType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCollectionDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'تاريخ بداية نطاق الاستحقاق (مطلوب) - YYYY-MM-DD',
    example: '2024-03-01',
  })
  @IsNotEmpty()
  @IsDateString()
  dateFrom: string;

  @ApiProperty({
    description: 'تاريخ نهاية نطاق الاستحقاق (مطلوب) - YYYY-MM-DD',
    example: '2024-03-31',
  })
  @IsNotEmpty()
  @IsDateString()
  dateTo: string;

  @ApiPropertyOptional({
    description: 'تصفية حسب نوع الطرف',
    enum: PartyType,
    example: PartyType.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(PartyType)
  partyType?: PartyType;

  @ApiPropertyOptional({
    description: 'معرف الطرف (UUID) - للتصفية على طرف بعينه',
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  @IsOptional()
  @IsUUID('4')
  partyId?: string;

  @ApiPropertyOptional({
    description: 'بحث نصي (اسم الطرف أو رقم المرجع)',
    example: 'محمد',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

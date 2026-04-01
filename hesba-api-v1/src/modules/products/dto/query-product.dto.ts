// ============================================================
// QueryProductDto — Pagination + filtering for product list
// ============================================================

import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto';

export class QueryProductDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'بحث بالاسم أو الكود (SKU) أو الوصف',
    example: 'أرز',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'فلترة حسب التصنيف (نص حر)',
    example: 'مواد غذائية',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'فلترة حسب الحالة — true: نشط فقط | false: معطّل فقط | (غير محدد): الكل',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;
}

// ============================================
// DTO: Customer Query / Filter
// ============================================
// يُستخدم في GET /customers (قائمة مع pagination + filters)
// ============================================

import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CustomerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'بحث بالاسم أو رقم الهاتف',
    example: 'أحمد',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'تصفية حسب الحالة: true = نشط، false = معطل',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj, key }) => {
    // With enableImplicitConversion=true, class-transformer may coerce "false" to true
    // before decorators run. Read the raw plain-object value first to preserve intent.
    const rawValue = obj?.[key] ?? value;
    if (rawValue === 'true' || rawValue === true) return true;
    if (rawValue === 'false' || rawValue === false) return false;
    return value;
  })
  isActive?: boolean;
}

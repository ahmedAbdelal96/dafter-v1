// ============================================
// DTO: Supplier Query (استعلام وتصفية الموردين)
// ============================================

import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto';

export class SupplierQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'البحث بالاسم أو رقم الهاتف',
    example: 'الأمل',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'تصفية حسب الحالة — true: نشط، false: موقف',
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

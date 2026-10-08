// ============================================
// DTO: Employee Query (استعلام وتصفية الموظفين)
// ============================================

import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto';

export class EmployeeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'البحث بالاسم أو رقم الهاتف أو المسمى الوظيفي',
    example: 'أحمد',
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

  @ApiPropertyOptional({
    description: 'حقل الترتيب',
    example: 'createdAt',
    enum: [
      'name',
      'phone',
      'jobTitle',
      'openingBalance',
      'isActive',
      'createdAt',
      'updatedAt',
      'fullName',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'name',
    'phone',
    'jobTitle',
    'openingBalance',
    'isActive',
    'createdAt',
    'updatedAt',
    'fullName',
  ])
  @Transform(({ value }) => (value === 'fullName' ? 'name' : value))
  sortBy?: string = 'createdAt';
}

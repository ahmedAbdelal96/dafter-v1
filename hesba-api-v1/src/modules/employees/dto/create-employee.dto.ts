// ============================================
// DTO: Create Employee (إنشاء موظف جديد)
// ============================================
// Owner / Staff[manageParties] ينشئ موظف جديد.
// عند الإنشاء يُهيأ سجل Balance تلقائياً بـ openingBalance.
//
// ملاحظة: الموظفون لا يملكون creditLimit (بعكس العملاء).
// ============================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'اسم الموظف — يجب أن يكون فريداً داخل الشركة',
    example: 'أحمد محمد علي',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم الموظف مطلوب' })
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'رقم الهاتف',
    example: '01012345678',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    description: 'المسمى الوظيفي',
    example: 'مندوب مبيعات',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({
    description: 'الرصيد الافتتاحي — يُسجل مباشرةً في Balance عند الإنشاء',
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'الرصيد الافتتاحي يجب أن يكون رقماً' })
  @Min(0, { message: 'الرصيد الافتتاحي لا يمكن أن يكون سالباً' })
  @Type(() => Number)
  openingBalance?: number;
}

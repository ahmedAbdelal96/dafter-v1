// ============================================
// DTO: Create Supplier (إنشاء مورد جديد)
// ============================================
// Owner / Staff[manageParties] ينشئ مورد جديد.
// عند الإنشاء يُهيأ سجل Balance تلقائياً بـ openingBalance.
//
// ملاحظة: الموردين لا يملكون creditLimit (بعكس العملاء).
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

export class CreateSupplierDto {
  @ApiProperty({
    description: 'اسم المورد — يجب أن يكون فريداً داخل الشركة',
    example: 'شركة الأمل للتوريدات',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم المورد مطلوب' })
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
    description: 'العنوان',
    example: 'شارع الصناعة، الإسكندرية',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

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

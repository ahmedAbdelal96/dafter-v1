// ============================================
// DTO: Create Customer (إنشاء عميل جديد)
// ============================================
// Owner / Staff[manageParties] ينشئ عميل جديد.
// عند الإنشاء يُهيأ سجل Balance تلقائياً بـ openingBalance.
// ============================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'اسم العميل — يجب أن يكون فريداً داخل الشركة',
    example: 'أحمد محمد التاجر',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم العميل مطلوب' })
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
    example: 'شارع الجمهورية، القاهرة',
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

  @ApiPropertyOptional({
    description: 'حد الائتمان الأقصى المسموح به — null تعني بدون حد',
    example: 10000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'حد الائتمان يجب أن يكون رقماً' })
  @Min(0, { message: 'حد الائتمان لا يمكن أن يكون سالباً' })
  @Type(() => Number)
  creditLimit?: number;
}

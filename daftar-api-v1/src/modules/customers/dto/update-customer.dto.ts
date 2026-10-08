// ============================================
// DTO: Update Customer (تعديل بيانات عميل)
// ============================================
// جميع حقول البيانات اختيارية — يُرسل فقط ما يتغير.
// `version` مطلوب دائماً للتحكم في التزامن المتفائل (Optimistic Locking).
//
// Optimistic Locking:
//   Client يجلب version من GET، يُرسلها مع الـ PATCH.
//   إذا تغيرت في الـ DB → 409 Conflict.
// ============================================

import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    description: 'اسم العميل — يجب أن يكون فريداً داخل الشركة',
    example: 'أحمد محمد التاجر (محدث)',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

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
    description: 'حد الائتمان — null لإزالة الحد',
    example: 10000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'حد الائتمان يجب أن يكون رقماً' })
  @Min(0, { message: 'حد الائتمان لا يمكن أن يكون سالباً' })
  @Type(() => Number)
  creditLimit?: number;

  @ApiPropertyOptional({
    description: 'تفعيل أو تعطيل العميل',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: `رقم نسخة السجل — مطلوب للحماية من التعديل المتزامن.
      يُجلب من GET /customers/:id → data.version`,
    example: 0,
    minimum: 0,
  })
  @IsInt({ message: 'version يجب أن يكون رقماً صحيحاً' })
  @Min(0)
  @IsNotEmpty({ message: 'version مطلوب' })
  @Type(() => Number)
  version: number;
}

// ============================================
// DTO: Update Supplier (تعديل بيانات مورد)
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
  IsBoolean,
  IsInt,
  IsNotEmpty,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupplierDto {
  @ApiPropertyOptional({
    description: 'اسم المورد — يجب أن يكون فريداً داخل الشركة',
    example: 'شركة الأمل للتوريدات (محدث)',
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
    example: 'شارع الصناعة، الإسكندرية',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    description: 'تفعيل أو تعطيل المورد',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: `رقم نسخة السجل — مطلوب للحماية من التعديل المتزامن.
      يُجلب من GET /suppliers/:id → data.version`,
    example: 0,
    minimum: 0,
  })
  @IsInt({ message: 'version يجب أن يكون عدداً صحيحاً' })
  @Min(0, { message: 'version لا يمكن أن يكون سالباً' })
  @IsNotEmpty({ message: 'version مطلوب' })
  @Type(() => Number)
  version: number;
}

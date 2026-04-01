// ============================================
// DTO: Update Employee (تعديل بيانات موظف)
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
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'اسم الموظف — يجب أن يكون فريداً داخل الشركة',
    example: 'أحمد محمد علي (محدث)',
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
    description: 'المسمى الوظيفي',
    example: 'مدير مبيعات',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({
    description: 'حالة الموظف — false لتعطيل بدون حذف',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({
    description:
      'رقم الإصدار الحالي — مطلوب لحماية التزامن (Optimistic Locking)',
    example: 0,
    minimum: 0,
  })
  @IsInt({ message: 'version يجب أن يكون عدداً صحيحاً' })
  @Min(0)
  @Type(() => Number)
  version: number;
}

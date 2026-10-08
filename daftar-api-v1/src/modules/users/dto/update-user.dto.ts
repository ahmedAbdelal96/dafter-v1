// ============================================
// DTO: Update User (تعديل بيانات مستخدم)
// ============================================
// Owner يعدل البيانات الأساسية فقط (اسم + هاتف).
// الصلاحيات لها endpoint منفصل: PATCH /users/:id/permissions
// ============================================

import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'الاسم الكامل',
    example: 'سارة محمد أحمد',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'رقم الهاتف',
    example: '01098765432',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

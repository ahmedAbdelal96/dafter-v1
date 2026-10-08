// ============================================
// DTO: Update Profile
// ============================================

import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'الاسم الكامل للمستخدم', example: 'محمد أحمد' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ description: 'رقم الهاتف', example: '+966512345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

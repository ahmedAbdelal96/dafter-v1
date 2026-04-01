import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';

/**
 * DTO: تسجيل الدخول
 *
 * Business:
 * - يتحقق من الإيميل + الباسورد
 * - يرجع access token + refresh token
 * - rememberMe يتحكم في مدة الـ refresh token
 */
export class LoginDto {
  @ApiProperty({
    example: 'ahmed@example.com',
    description: 'البريد الإلكتروني',
  })
  @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
  @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صحيحة' })
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'كلمة المرور',
  })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @IsString()
  password: string;

  @ApiProperty({
    example: false,
    description: 'تذكرني — يزيد مدة الجلسة إلى 7 أيام بدلاً من 24 ساعة',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

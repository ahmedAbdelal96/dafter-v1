import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

/**
 * DTO: تسجيل حساب جديد (شركة + Owner)
 *
 * Business:
 * - يسجل شركة جديدة ومستخدم Owner في transaction واحدة
 * - يبدأ فترة تجريبية مجانية تلقائياً
 * - يرجع JWT tokens فوراً بعد التسجيل
 */
export class RegisterDto {
  // ── بيانات المستخدم ──

  @ApiProperty({
    example: 'أحمد محمد',
    description: 'الاسم الكامل للمستخدم',
  })
  @IsNotEmpty({ message: 'الاسم مطلوب' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    example: 'ahmed@example.com',
    description: 'البريد الإلكتروني (يستخدم لتسجيل الدخول)',
  })
  @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
  @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صحيحة' })
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'كلمة المرور (8 أحرف على الأقل، حرف كبير + رقم)',
  })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @IsString()
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'كلمة المرور يجب أن تحتوي على حرف كبير ورقم على الأقل',
  })
  password: string;

  @ApiProperty({
    example: '01012345678',
    description: 'رقم الهاتف (اختياري)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // ── بيانات الشركة ──

  @ApiProperty({
    example: 'شركة النور للتجارة',
    description: 'اسم الشركة / المنشأة',
  })
  @IsNotEmpty({ message: 'اسم الشركة مطلوب' })
  @IsString()
  @MaxLength(200)
  companyName: string;

  @ApiProperty({
    example: '02-12345678',
    description: 'هاتف الشركة (اختياري)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  companyPhone?: string;

  @ApiProperty({
    example: 'القاهرة، مصر',
    description: 'عنوان الشركة (اختياري)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  companyAddress?: string;
}

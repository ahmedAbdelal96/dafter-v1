import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description:
      'نفس البريد الإلكتروني أو رقم الهاتف المستخدم في طلب إعادة التعيين',
    example: 'ahmed@example.com',
  })
  @IsString()
  @IsNotEmpty({ message: 'البريد الإلكتروني أو رقم الهاتف مطلوب' })
  @Matches(
    /^([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})|(\+[1-9]\d{7,14})$/,
    {
      message: 'يجب إدخال بريد إلكتروني صالح أو رقم هاتف دولي يبدأ بـ +',
    },
  )
  identifier: string;

  @ApiProperty({
    description: 'الكود المؤلف من 6 أرقام المرسل إليك',
    example: '483921',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'كود التحقق مطلوب' })
  @MinLength(6, { message: 'الكود يجب أن يكون 6 أرقام' })
  @MaxLength(6, { message: 'الكود يجب أن يكون 6 أرقام' })
  @Matches(/^\d{6}$/, { message: 'الكود يجب أن يتكون من 6 أرقام فقط' })
  otp: string;

  @ApiProperty({
    description: 'كلمة المرور الجديدة (8 أحرف على الأقل)',
    example: 'MyNewPassword@123',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty({ message: 'كلمة المرور الجديدة مطلوبة' })
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  @MaxLength(72, { message: 'كلمة المرور طويلة جداً' })
  newPassword: string;
}

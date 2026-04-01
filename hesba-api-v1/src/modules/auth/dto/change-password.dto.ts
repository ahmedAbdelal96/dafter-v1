import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

/**
 * DTO: تغيير كلمة المرور
 *
 * Business:
 * - لازم يكتب كلمة المرور الحالية للتأكيد
 * - كلمة المرور الجديدة لازم تكون مختلفة عن الحالية
 * - نفس شروط القوة المطبقة في التسجيل
 */
export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPass123!',
    description: 'كلمة المرور الحالية',
  })
  @IsNotEmpty({ message: 'كلمة المرور الحالية مطلوبة' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewPass456!',
    description: 'كلمة المرور الجديدة (8 أحرف على الأقل، حرف كبير + رقم)',
  })
  @IsNotEmpty({ message: 'كلمة المرور الجديدة مطلوبة' })
  @IsString()
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'كلمة المرور يجب أن تحتوي على حرف كبير ورقم على الأقل',
  })
  newPassword: string;
}

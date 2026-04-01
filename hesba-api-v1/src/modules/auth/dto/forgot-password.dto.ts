import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: `البريد الإلكتروني أو رقم الهاتف المرتبط بالحساب.
      - إيميل مثال: ahmed@example.com
      - هاتف مثال: +201012345678 (يجب أن يبدأ بـ +)
    `,
    example: 'ahmed@example.com',
  })
  @IsString()
  @IsNotEmpty({ message: 'البريد الإلكتروني أو رقم الهاتف مطلوب' })
  // Allow email OR international phone starting with +
  @Matches(
    /^([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})|(\+[1-9]\d{7,14})$/,
    {
      message: 'يجب إدخال بريد إلكتروني صالح أو رقم هاتف دولي يبدأ بـ +',
    },
  )
  identifier: string;
}

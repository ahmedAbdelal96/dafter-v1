// ============================================
// DTO: Reset User Credentials (إعادة ضبط بيانات الدخول)
// ============================================
// OWNER triggers an OTP reset for a STAFF user via email or WhatsApp.
// If channel is omitted the system resolves automatically (email first).
// ============================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResetCredentialsDto {
  @ApiPropertyOptional({
    description: 'قناة إرسال رمز OTP — email أو whatsapp (افتراضي: email إن وُجد)',
    enum: ['email', 'whatsapp'],
    example: 'email',
  })
  @IsOptional()
  @IsIn(['email', 'whatsapp'])
  channel?: 'email' | 'whatsapp';

  @ApiPropertyOptional({
    description: 'سبب إعادة الضبط (للتدقيق فقط)',
    maxLength: 200,
    example: 'نسي الموظف كلمة المرور',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

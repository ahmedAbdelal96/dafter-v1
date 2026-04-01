// ============================================================
// WhatsApp Service — Twilio WhatsApp Business API
// ============================================================
// مسؤول عن إرسال رسائل WhatsApp من التطبيق.
// حالياً: إرسال OTP لإعادة تعيين كلمة المرور.
//
// الإعداد المطلوب في .env:
//   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   TWILIO_AUTH_TOKEN=your_auth_token
//   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
//
// ملاحظة Twilio Sandbox:
//   للاختبار: استخدم الـ Sandbox number وأرسل "join <word>" أولاً.
//   للـ production: استخدم رقم WhatsApp Business معتمد.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private client: ReturnType<typeof twilio>;
  private readonly fromNumber: string;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.get<string>('twilio.accountSid');
    const authToken = this.config.get<string>('twilio.authToken');
    this.fromNumber = this.config.get<string>('twilio.whatsappFrom', '');

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    } else {
      this.logger.warn(
        'Twilio credentials not configured — WhatsApp sending disabled',
      );
    }
  }

  // ══════════════════════════════════════════════════════════
  // PASSWORD RESET OTP
  // ══════════════════════════════════════════════════════════

  async sendPasswordResetOtp(phone: string, otp: string): Promise<void> {
    if (!this.client) {
      this.logger.warn(
        `WhatsApp not configured. OTP for ${phone}: ${otp} (DEV only)`,
      );
      return;
    }

    // Normalize the phone number to whatsapp: format
    const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;

    const body = [
      '🔐 *دفتر — كود إعادة تعيين كلمة المرور*',
      '',
      `كودك: *${otp}*`,
      '',
      '⏰ صالح لمدة *15 دقيقة* فقط.',
      'إذا لم تطلب هذا، تجاهل الرسالة.',
    ].join('\n');

    try {
      await this.client.messages.create({
        from: this.fromNumber,
        to,
        body,
      });

      this.logger.log(`Password reset OTP sent via WhatsApp to ${phone}`);
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp to ${phone}: ${error.message}`,
      );
      throw error;
    }
  }
}

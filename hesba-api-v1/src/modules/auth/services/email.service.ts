// ============================================================
// Email Service — Gmail SMTP via Nodemailer
// ============================================================
// مسؤول عن إرسال كل الإيميلات من التطبيق.
// حالياً: إرسال OTP لإعادة تعيين كلمة المرور.
//
// الإعداد المطلوب في .env:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_SECURE=false
//   SMTP_USER=your-email@gmail.com
//   SMTP_PASSWORD=your-app-password   ← Gmail App Password (not account password)
//   EMAIL_FROM=Daftar <noreply@daftar.app>
//
// ملاحظة Gmail:
//   يجب تفعيل "2-Step Verification" ثم إنشاء "App Password".
//   لا تستخدم كلمة مرور الحساب مباشرة.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('email.smtp.host', 'smtp.gmail.com'),
      port: this.config.get<number>('email.smtp.port', 587),
      secure: this.config.get<boolean>('email.smtp.secure', false),
      auth: {
        user: this.config.get<string>('email.smtp.auth.user'),
        pass: this.config.get<string>('email.smtp.auth.pass'),
      },
    });
  }

  // ══════════════════════════════════════════════════════════
  // PASSWORD RESET OTP
  // ══════════════════════════════════════════════════════════

  async sendPasswordResetOtp(to: string, otp: string): Promise<void> {
    const from = this.config.get<string>(
      'email.from',
      'Daftar <noreply@daftar.app>',
    );

    const html = this.buildResetOtpHtml(otp);

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'كود إعادة تعيين كلمة المرور — دفتر',
        html,
        text: `كود إعادة تعيين كلمة المرور: ${otp}\n\nهذا الكود صالح لمدة 15 دقيقة فقط.\nإذا لم تطلب هذا، تجاهل هذا الإيميل.`,
      });

      this.logger.log(`Password reset OTP sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }

  // ── Private: HTML Template ─────────────────────────────────

  private buildResetOtpHtml(otp: string): string {
    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;direction:rtl;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0"
                   style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <tr>
                <td align="center" style="padding-bottom:24px;">
                  <h1 style="color:#1a1a2e;font-size:24px;margin:0;">📒 دفتر</h1>
                </td>
              </tr>
              <tr>
                <td style="color:#333;font-size:16px;line-height:1.7;padding-bottom:24px;">
                  <p style="margin:0 0 12px;">مرحباً،</p>
                  <p style="margin:0;">
                    تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>دفتر</strong>.
                    استخدم الكود التالي لإتمام العملية:
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:24px 0;">
                  <div style="background:#f0f4ff;border:2px dashed #4361ee;border-radius:10px;
                              display:inline-block;padding:16px 48px;">
                    <span style="font-size:36px;font-weight:bold;letter-spacing:8px;
                                 color:#4361ee;font-family:monospace;">${otp}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="color:#666;font-size:14px;line-height:1.7;padding:16px 0 24px;">
                  <p style="margin:0 0 8px;">⏰ هذا الكود <strong>صالح لمدة 15 دقيقة فقط</strong>.</p>
                  <p style="margin:0;">إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد الإلكتروني.</p>
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #eee;padding-top:16px;text-align:center;
                           color:#999;font-size:12px;">
                  © ${new Date().getFullYear()} دفتر — جميع الحقوق محفوظة
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }
}

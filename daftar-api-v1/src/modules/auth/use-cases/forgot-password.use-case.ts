// ============================================================
// ForgotPassword Use Case
// ============================================================
// Flow:
//   1. Find user by email OR phone (identifier)
//   2. If not found → return success anyway (security: don't reveal existence)
//   3. Generate cryptographically secure 6-digit OTP
//   4. Store SHA-256 hash in DB (delete previous tokens first)
//   5. Send OTP via appropriate channel:
//      - identifier is email  → send via Gmail (EmailService)
//      - identifier is phone  → send via WhatsApp (WhatsAppService)
//
// Security notes:
//   - Always return 200 even if user not found (prevent user enumeration)
//   - Rate limiting handled at controller level (Throttle decorator)
//   - OTP expires in 15 minutes
//   - SHA-256 hash stored (not raw OTP) — same as refresh token strategy
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { AuthRepository } from '../auth.repository';
import { EmailService } from '../services/email.service';
import { WhatsAppService } from '../services/whatsapp.service';

const OTP_EXPIRY_MINUTES = 15;

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  /**
   * @param identifier — email or international phone (+20...)
   * @returns channel used ('email' | 'whatsapp' | 'not_found')
   *          Always succeeds from the caller's perspective.
   */
  async execute(identifier: string): Promise<{ channel: string }> {
    const isEmail = identifier.includes('@');
    const normalizedIdentifier = isEmail
      ? identifier.toLowerCase().trim()
      : identifier.trim();

    // ── Step 1: Find user ─────────────────────────────────────
    const user =
      await this.authRepository.findUserByIdentifier(normalizedIdentifier);

    if (!user) {
      // ⚠️ Return success silently — never reveal whether user exists
      this.logger.warn(
        `ForgotPassword: no user found for identifier "${normalizedIdentifier}"`,
      );
      return { channel: isEmail ? 'email' : 'whatsapp' };
    }

    if (user.status === 'DISABLED') {
      // Same silent behavior — disabled accounts don't get a different error
      this.logger.warn(`ForgotPassword: account disabled for user ${user.id}`);
      return { channel: isEmail ? 'email' : 'whatsapp' };
    }

    // ── Step 2: Generate OTP ──────────────────────────────────
    // crypto.randomInt is cryptographically secure (CSPRNG)
    const otp = crypto.randomInt(100000, 999999).toString();
    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // ── Step 3: Store hashed OTP ──────────────────────────────
    const channel = isEmail ? 'email' : 'whatsapp';

    await this.authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      channel,
      expiresAt,
    });

    // ── Step 4: Send OTP ──────────────────────────────────────
    try {
      if (channel === 'email') {
        await this.emailService.sendPasswordResetOtp(normalizedIdentifier, otp);
      } else {
        await this.whatsAppService.sendPasswordResetOtp(
          normalizedIdentifier,
          otp,
        );
      }
    } catch (error) {
      // Log but don't expose delivery failure to the client
      // (OTP is stored in DB — can retry via a new request)
      this.logger.error(
        `Failed to send OTP via ${channel} to ${normalizedIdentifier}: ${error.message}`,
      );
    }

    this.logger.log(
      `Password reset OTP created for user ${user.id} via ${channel}`,
    );

    return { channel };
  }
}

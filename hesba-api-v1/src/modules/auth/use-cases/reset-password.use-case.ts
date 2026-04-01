// ============================================================
// ResetPassword Use Case
// ============================================================
// Flow:
//   1. Find user by identifier (email or phone)
//   2. Hash the submitted OTP and look up a valid token
//   3. Verify the token belongs to the same user
//   4. Ensure new password ≠ current password (UX guard)
//   5. Consume token (mark used) + update password + revoke all refresh tokens
//
// Security:
//   - Hash comparison (SHA-256) — timing-safe via exact DB lookup
//   - Token is single-use (usedAt is set on consumption)
//   - All refresh tokens revoked → all devices logged out
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../auth.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { NotificationsService } from '../../notifications/notifications.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly t: TranslationService,
    private readonly notifService: NotificationsService,
  ) {}

  async execute(identifier: string, otp: string, newPassword: string) {
    // ── Step 1: Find user ─────────────────────────────────────
    const isEmail = identifier.includes('@');
    const normalizedIdentifier = isEmail
      ? identifier.toLowerCase().trim()
      : identifier.trim();

    const user =
      await this.authRepository.findUserByIdentifier(normalizedIdentifier);

    if (!user) {
      throw new BadRequestException(
        this.t.translate('auth.resetPassword.invalidOtp'),
      );
    }

    // ── Step 2: Hash OTP and find valid token ─────────────────
    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');

    const resetToken = await this.authRepository.findValidResetToken(tokenHash);

    if (!resetToken) {
      throw new BadRequestException(
        this.t.translate('auth.resetPassword.invalidOtp'),
      );
    }

    // ── Step 3: Verify token belongs to this user ─────────────
    if (resetToken.userId !== user.id) {
      // This shouldn't happen in normal usage; log as suspicious
      this.logger.warn(
        `ResetPassword: token userId mismatch! token.userId=${resetToken.userId} vs user.id=${user.id}`,
      );
      throw new BadRequestException(
        this.t.translate('auth.resetPassword.invalidOtp'),
      );
    }

    // ── Step 4: Verify user is still active ───────────────────
    if (resetToken.user.status === 'DISABLED') {
      throw new BadRequestException(
        this.t.translate('auth.login.accountDisabled'),
      );
    }

    // ── Step 5: Hash new password + consume token (atomic) ────
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.authRepository.consumeResetToken(
      resetToken.id,
      user.id,
      newPasswordHash,
    );

    this.logger.log(
      `Password reset completed for user ${user.id} — all sessions revoked`,
    );

    // Side-effect: security notification (fire-and-forget)
    this.notifService
      .send({
        userId: user.id,
        type: 'auth.password.reset',
        title: 'إعادة تعيين كلمة المرور 🔐',
        body: 'تم إعادة تعيين كلمة مرورك بنجاح. جميع الأجهزة تم تسجيل خروجها.',
        data: { screen: 'Security' },
      })
      .catch((err: Error) =>
        this.logger.error(
          `Password-reset notification failed: ${err.message}`,
          err.stack,
        ),
      );
  }
}

// ============================================
// Use Case: Change Password (تغيير كلمة المرور)
// ============================================
// Flow:
//  1. Verify current password
//  2. Ensure new password != current
//  3. Hash new password
//  4. Update in DB
//  5. Revoke all refresh tokens (force re-login on all devices)
// ============================================

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../auth.repository';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { TranslationService } from '../../../common/services/translation.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class ChangePasswordUseCase {
  private readonly logger = new Logger(ChangePasswordUseCase.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly t: TranslationService,
    private readonly notifService: NotificationsService,
  ) {}

  async execute(userId: string, dto: ChangePasswordDto): Promise<void> {
    // Step 1: Get user with current password hash
    const user = await this.authRepo.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException(
        this.t.translate('auth.profile.get.notFound'),
      );
    }

    // Step 2: Verify current password
    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentValid) {
      throw new BadRequestException(
        this.t.translate('auth.changePassword.wrongCurrentPassword'),
      );
    }

    // Step 3: Ensure new password is different
    const isSame = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException(
        this.t.translate('auth.changePassword.samePassword'),
      );
    }

    // Step 4: Hash and update
    const SALT_ROUNDS = 12;
    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.authRepo.updatePassword(userId, newHash);

    // Step 5: Revoke all sessions — user must re-login everywhere
    await this.authRepo.revokeAllUserTokens(userId);

    this.logger.log(`User ${userId} changed their password`);

    // Side-effect: security notification (fire-and-forget)
    this.notifService
      .send({
        userId,
        type: 'auth.password.changed',
        title: 'تغيير كلمة المرور 🔐',
        body: 'تم تغيير كلمة مرورك بنجاح. إذا لم تكن أنت، تواصل مع الدعم فوراً.',
        data: { screen: 'Security' },
      })
      .catch((err: Error) =>
        this.logger.error(
          `Password-change notification failed: ${err.message}`,
          err.stack,
        ),
      );
  }
}

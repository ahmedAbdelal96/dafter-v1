import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import { AuthRepository } from '../../auth/auth.repository';
import { EmailService } from '../../auth/services/email.service';
import { WhatsAppService } from '../../auth/services/whatsapp.service';
import { TranslationService } from '../../../common/services/translation.service';
import { UsersRepository } from '../users.repository';

const OTP_EXPIRY_MINUTES = 15;

export interface ResetUserCredentialsInput {
  channel?: 'email' | 'whatsapp';
  reason?: string;
}

@Injectable()
export class ResetUserCredentialsUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authRepository: AuthRepository,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
    private readonly t: TranslationService,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    actorUserId: string,
    input: ResetUserCredentialsInput,
  ) {
    const user = await this.usersRepository.findById(companyId, userId);
    if (!user) {
      throw new NotFoundException(this.t.translate('users.get.notFound'));
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        this.t.translate('users.credentialsReset.superAdminForbidden'),
      );
    }

    const channel = this.resolveChannel(user.email, user.phone, input.channel);
    const otp = crypto.randomInt(100000, 999999).toString();
    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      channel,
      expiresAt,
    });

    // Security-first: force all active sessions to expire immediately.
    await this.authRepository.revokeAllUserTokens(user.id);

    try {
      if (channel === 'email') {
        await this.emailService.sendPasswordResetOtp(user.email, otp);
      } else {
        await this.whatsAppService.sendPasswordResetOtp(user.phone!, otp);
      }
    } catch {
      throw new InternalServerErrorException(
        this.t.translate('users.credentialsReset.deliveryFailed'),
      );
    }

    await this.usersRepository.logCredentialsReset({
      companyId,
      actorUserId,
      targetUserId: user.id,
      channel,
      reason: input.reason,
      expiresAt,
    });

    return {
      userId: user.id,
      channel,
      expiresAt: expiresAt.toISOString(),
      sessionsRevoked: true,
    };
  }

  private resolveChannel(
    email: string | null | undefined,
    phone: string | null | undefined,
    preferred?: 'email' | 'whatsapp',
  ): 'email' | 'whatsapp' {
    if (preferred === 'email') {
      if (!email) {
        throw new BadRequestException(
          this.t.translate('users.credentialsReset.emailMissing'),
        );
      }
      return 'email';
    }

    if (preferred === 'whatsapp') {
      if (!phone) {
        throw new BadRequestException(
          this.t.translate('users.credentialsReset.phoneMissing'),
        );
      }
      return 'whatsapp';
    }

    if (email) return 'email';
    if (phone) return 'whatsapp';

    throw new BadRequestException(
      this.t.translate('users.credentialsReset.noDeliveryChannel'),
    );
  }
}

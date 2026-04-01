// ============================================
// Use Case: Register (تسجيل حساب جديد)
// ============================================
// Flow:
//  1. Validate email is unique
//  2. Hash password with bcrypt
//  3. Create Company + Owner + Trial Subscription (atomic transaction)
//  4. Generate JWT tokens
//  5. Store refresh token
//  6. Return user data + tokens
// ============================================

import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../auth.repository';
import { RegisterDto } from '../dto/register.dto';
import { TokenService } from '../services/token.service';
import { TranslationService } from '../../../common/services/translation.service';
import { PlatformSettingsService } from '../../platform/platform-settings.service';

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly t: TranslationService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  async execute(dto: RegisterDto, meta: { userAgent?: string; ip?: string }) {
    // Step 1: Check if email already exists
    const emailTaken = await this.authRepo.emailExists(dto.email);
    if (emailTaken) {
      throw new ConflictException(
        this.t.translate('auth.register.emailExists'),
      );
    }

    // Step 2: Hash password (cost factor 12 — balance between security and speed)
    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Step 3: Resolve platform-controlled signup defaults.
    // Falls back to environment defaults when settings are not available.
    const platformSettings = await this.platformSettingsService.getSettings();
    const trialDays =
      platformSettings.trialDefaults.durationDays ??
      this.configService.get<number>('TRIAL_DAYS', 14);
    const autoActivateOnSignup =
      platformSettings.trialDefaults.autoActivateOnSignup ?? true;
    const requireCompanyPhone =
      platformSettings.trialDefaults.requireCompanyPhone ?? false;

    if (requireCompanyPhone && !dto.companyPhone?.trim()) {
      throw new BadRequestException(
        'Company phone is required by platform settings',
      );
    }

    // Step 4: Atomic transaction — create company + owner + subscription
    let result;
    try {
      result = await this.authRepo.registerCompanyWithOwner({
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        companyName: dto.companyName,
        companyPhone: dto.companyPhone,
        companyAddress: dto.companyAddress,
        trialDays,
        autoActivateOnSignup,
      });
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        this.t.translate('auth.register.failed'),
      );
    }

    const { user, company, subscription } = result;

    // Step 5: Generate tokens and store refresh token
    const tokens = await this.tokenService.generateAndStoreTokens(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        companyId: company.id,
      },
      { userAgent: meta.userAgent, ip: meta.ip },
    );

    this.logger.log(
      `New company registered: "${company.name}" (${company.id}), owner: ${user.email}`,
    );

    // Step 6: Return response
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      company: {
        id: company.id,
        name: company.name,
      },
      subscription: {
        status: subscription.status,
        trialEndsAt: subscription.endDate,
      },
      tokens,
    };
  }
}

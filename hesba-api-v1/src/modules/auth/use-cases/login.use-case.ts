// ============================================
// Use Case: Login (تسجيل الدخول)
// ============================================
// Flow:
//  1. Check account lockout (via Redis)
//  2. Find user by email
//  3. Verify password with bcrypt
//  4. Check user status (ACTIVE) and company status
//  5. Generate JWT tokens
//  6. Store refresh token
//  7. Reset failed attempts on success
// ============================================

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../auth.repository';
import { LoginDto } from '../dto/login.dto';
import { TokenService } from '../services/token.service';
import { TranslationService } from '../../../common/services/translation.service';
import { CacheService } from '../../../common/cache/cache.service';

/** Maximum failed login attempts before lockout */
const MAX_FAILED_ATTEMPTS = 5;
/** Lockout duration in minutes */
const LOCKOUT_MINUTES = 15;

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly t: TranslationService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(dto: LoginDto, meta: { userAgent?: string; ip?: string }) {
    const email = dto.email.toLowerCase().trim();

    // Step 1: Check if account is locked out
    await this.checkLockout(email);

    // Step 2: Find user by email
    const user = await this.authRepo.findUserByEmail(email);
    if (!user) {
      await this.incrementFailedAttempts(email);
      throw new UnauthorizedException(
        this.t.translate('auth.login.invalidCredentials'),
      );
    }

    // Step 3: Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      await this.incrementFailedAttempts(email);
      throw new UnauthorizedException(
        this.t.translate('auth.login.invalidCredentials'),
      );
    }

    // Step 4: Check user status
    if (user.status === 'DISABLED' || user.isDeleted) {
      throw new ForbiddenException(
        this.t.translate('auth.login.accountDisabled'),
      );
    }

    // Step 5: Check company status (skip for SUPER_ADMIN who may not have a company)
    if (user.company) {
      if (!user.company.isActive || user.company.isDeleted) {
        throw new ForbiddenException(
          this.t.translate('auth.login.companyDisabled'),
        );
      }
    }

    // Step 6: Generate tokens — use rememberMe to determine refresh token lifespan
    const tokens = await this.tokenService.generateAndStoreTokens(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      {
        userAgent: meta.userAgent,
        ip: meta.ip,
        rememberMe: dto.rememberMe,
      },
    );

    // Step 7: Clear failed login attempts on success
    await this.clearFailedAttempts(email);

    this.logger.log(`User logged in: ${user.email} (${user.role})`);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      tokens,
    };
  }

  // ─────────────────────────────────────────────
  // Account Lockout Helpers (Redis-based)
  // ─────────────────────────────────────────────

  /**
   * Check if the account is currently locked.
   * Uses Redis key: `login_attempts:{email}`
   */
  private async checkLockout(email: string): Promise<void> {
    const key = `login_attempts:${email}`;
    const attemptsStr = await this.cacheService.get<string>(key);
    if (!attemptsStr) return;

    const attempts = parseInt(attemptsStr, 10);
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      throw new UnauthorizedException(
        this.t.translate('auth.login.accountLocked', {
          minutes: LOCKOUT_MINUTES,
        }),
      );
    }
  }

  /**
   * Increment failed login attempts.
   * When max is reached, the TTL acts as the lockout window.
   */
  private async incrementFailedAttempts(email: string): Promise<void> {
    const key = `login_attempts:${email}`;
    const current = await this.cacheService.get<string>(key);
    const attempts = current ? parseInt(current, 10) + 1 : 1;

    // Set/reset with lockout window TTL
    await this.cacheService.set(key, attempts.toString(), {
      ttl: LOCKOUT_MINUTES * 60,
    });

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      this.logger.warn(
        `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts: ${email}`,
      );
    }
  }

  /**
   * Clear failed attempts on successful login
   */
  private async clearFailedAttempts(email: string): Promise<void> {
    await this.cacheService.del(`login_attempts:${email}`);
  }
}

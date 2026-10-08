// ============================================
// Use Case: Login (تسجيل الدخول)
// ============================================
// Flow:
//  1. Check account lockout (via Redis)
//  2. Resolve credentials (email + password)
//  3. Check user/company eligibility
//  4. Generate JWT tokens
//  5. Clear failed attempts on success
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
import { JwtPayload } from '../../../common/types';

/** Maximum failed login attempts before lockout */
const MAX_FAILED_ATTEMPTS = 5;
/** Lockout duration in minutes */
const LOCKOUT_MINUTES = 15;

type RequestMeta = { userAgent?: string; ip?: string };
type LoginUser = NonNullable<Awaited<ReturnType<AuthRepository['findUserByEmail']>>>;

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly t: TranslationService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(dto: LoginDto, meta: RequestMeta) {
    const email = this.normalizeEmail(dto.email);

    // Step 1: Check if account is locked out
    await this.checkLockout(email);

    // Step 2: Resolve credentials (user + password)
    const user = await this.getUserByCredentialsOrThrow(email, dto.password);

    // Step 3: Check user/company eligibility
    this.assertUserEligibility(user);

    // Step 4: Generate tokens - use rememberMe to determine refresh token lifespan
    const tokens = await this.issueTokens(user, meta, dto.rememberMe);

    // Step 5: Clear failed login attempts on success
    await this.clearFailedAttempts(email);

    this.logger.log(`User logged in: ${user.email} (${user.role})`);

    return {
      user: this.buildLoginUserResponse(user),
      tokens,
    };
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private async getUserByCredentialsOrThrow(
    email: string,
    password: string,
  ): Promise<LoginUser> {
    const user = await this.requireUserOrThrow(email);

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.throwInvalidCredentials(email);
    }

    return user;
  }

  private async requireUserOrThrow(email: string): Promise<LoginUser> {
    const user = await this.authRepo.findUserByEmail(email);
    if (!user) {
      await this.throwInvalidCredentials(email);
    }
    return user as LoginUser;
  }

  private assertUserEligibility(user: LoginUser): void {
    if (user.status === 'DISABLED' || user.isDeleted) {
      throw new ForbiddenException(
        this.t.translate('auth.login.accountDisabled'),
      );
    }

    // Skip company checks for users that do not have a company context.
    if (user.company && (!user.company.isActive || user.company.isDeleted)) {
      throw new ForbiddenException(
        this.t.translate('auth.login.companyDisabled'),
      );
    }
  }

  private async issueTokens(
    user: LoginUser,
    meta: RequestMeta,
    rememberMe?: boolean,
  ) {
    return this.tokenService.generateAndStoreTokens(
      this.buildJwtPayload(user),
      {
        userAgent: meta.userAgent,
        ip: meta.ip,
        rememberMe,
      },
    );
  }

  private buildJwtPayload(user: LoginUser): Omit<JwtPayload, 'iat' | 'exp'> {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
  }

  private buildLoginUserResponse(user: LoginUser) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
  }

  private async throwInvalidCredentials(email: string): Promise<never> {
    await this.incrementFailedAttempts(email);
    throw new UnauthorizedException(
      this.t.translate('auth.login.invalidCredentials'),
    );
  }

  // --------------------------------------------------------------
  // Account Lockout Helpers (Redis-based)
  // --------------------------------------------------------------

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

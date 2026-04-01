// ============================================
// Token Service — JWT + Refresh Token Management
// ============================================
// Centralized token operations used by multiple use cases.
// Handles:
//  - Access token generation (JWT, short-lived)
//  - Refresh token generation (random, long-lived)
//  - Token hashing (SHA-256 for DB storage)
//  - Token storage in database
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { AuthRepository } from '../auth.repository';
import { JwtPayload } from '../../../common/types';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authRepo: AuthRepository,
  ) {}

  /**
   * Generate access + refresh tokens and persist the refresh token.
   *
   * Access token: Short-lived JWT (15m default), contains user identity.
   * Refresh token: Long-lived random string (7d default), stored hashed in DB.
   *
   * @param payload - JWT payload (sub, email, role, companyId)
   * @param meta - Device metadata for refresh token tracking
   * @returns { accessToken, refreshToken }
   */
  async generateAndStoreTokens(
    payload: Omit<JwtPayload, 'iat' | 'exp'>,
    meta: { userAgent?: string; ip?: string; rememberMe?: boolean } = {},
  ) {
    // ── Access Token ──
    const accessToken = this.jwtService.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        companyId: payload.companyId,
      },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.accessExpiresIn',
          '15m',
        ) as any,
      },
    );

    // ── Refresh Token ──
    // Generate a cryptographically secure random token (64 bytes → 128 hex chars)
    const refreshToken = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(refreshToken);

    // Calculate expiry based on rememberMe preference
    const refreshExpiresIn = meta.rememberMe
      ? this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN_WITH_REMEMBER',
          '7d',
        )
      : this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN_WITHOUT_REMEMBER',
          '24h',
        );

    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    // Store hashed refresh token in DB
    await this.authRepo.createRefreshToken({
      userId: payload.sub,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent?.substring(0, 500), // Limit user agent length
      ip: meta.ip,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Hash a token using SHA-256.
   * We NEVER store raw refresh tokens — only their hashes.
   * This way, even if DB is compromised, tokens can't be replayed.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Calculate expiry date from a duration string like "7d", "24h", "15m"
   */
  private calculateExpiry(duration: string): Date {
    const now = new Date();
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default to 7 days if format is unrecognized
      now.setDate(now.getDate() + 7);
      return now;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        now.setSeconds(now.getSeconds() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'd':
        now.setDate(now.getDate() + value);
        break;
    }

    return now;
  }
}

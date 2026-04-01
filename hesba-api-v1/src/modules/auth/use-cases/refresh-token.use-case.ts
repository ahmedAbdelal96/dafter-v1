// ============================================
// Use Case: Refresh Token (تجديد التوكن)
// ============================================
// Implements Refresh Token Rotation:
//  1. Receive current refresh token
//  2. Hash it and look up in DB
//  3. Validate (not revoked, not expired)
//  4. Revoke the old token immediately
//  5. Generate new access + refresh token pair
//  6. Store new refresh token
//
// Security note: If a revoked token is reused, it means the token was
// stolen. In a production system you'd revoke ALL user tokens as a
// precaution (token family revocation). We implement this.
// ============================================

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthRepository } from '../auth.repository';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { TokenService } from '../services/token.service';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly t: TranslationService,
  ) {}

  async execute(
    dto: RefreshTokenDto,
    meta: { userAgent?: string; ip?: string },
  ) {
    // Step 1: Hash the incoming token to look it up
    const tokenHash = this.tokenService.hashToken(dto.refreshToken);

    // Step 2: Find the token in DB
    const storedToken = await this.authRepo.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedException(
        this.t.translate('auth.refresh.invalidToken'),
      );
    }

    // Step 3: Check if token was already revoked (possible token theft!)
    if (storedToken.revokedAt) {
      // Security: Revoke ALL tokens for this user (token family attack)
      this.logger.warn(
        `Reuse of revoked refresh token detected for user ${storedToken.userId}. Revoking all sessions.`,
      );
      await this.authRepo.revokeAllUserTokens(storedToken.userId);

      throw new UnauthorizedException(this.t.translate('auth.refresh.revoked'));
    }

    // Step 4: Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException(this.t.translate('auth.refresh.expired'));
    }

    // Step 5: Check if user is still valid
    const user = storedToken.user;
    if (!user || user.status === 'DISABLED' || user.isDeleted) {
      await this.authRepo.revokeRefreshToken(tokenHash);
      throw new UnauthorizedException(
        this.t.translate('auth.login.accountDisabled'),
      );
    }

    // Step 6: Check company status
    if (user.company && (!user.company.isActive || user.company.isDeleted)) {
      await this.authRepo.revokeAllUserTokens(user.id);
      throw new UnauthorizedException(
        this.t.translate('auth.login.companyDisabled'),
      );
    }

    // Step 7: Revoke the old token (rotation)
    await this.authRepo.revokeRefreshToken(tokenHash);

    // Step 8: Generate new token pair
    const tokens = await this.tokenService.generateAndStoreTokens(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      { userAgent: meta.userAgent, ip: meta.ip },
    );

    return { tokens };
  }
}

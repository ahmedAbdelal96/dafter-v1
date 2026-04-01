// ============================================
// Use Case: Logout (تسجيل خروج — جهاز واحد)
// ============================================
// Revokes the specific refresh token provided.
// The access token will expire naturally (short-lived, 15m).
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { AuthRepository } from '../auth.repository';
import { TokenService } from '../services/token.service';

@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(refreshToken: string, userId: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(refreshToken);

    // Attempt to revoke — if token doesn't exist or is already revoked, no error
    try {
      await this.authRepo.revokeRefreshToken(tokenHash);
    } catch {
      // Token not found or already revoked — silently succeed
      // (we don't want to leak info about token existence)
    }

    this.logger.log(`User ${userId} logged out from single device`);
  }
}

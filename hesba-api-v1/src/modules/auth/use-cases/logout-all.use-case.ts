// ============================================
// Use Case: Logout All (تسجيل خروج — كل الأجهزة)
// ============================================
// Revokes ALL refresh tokens for the user.
// Useful when user suspects account compromise.
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { AuthRepository } from '../auth.repository';

@Injectable()
export class LogoutAllUseCase {
  private readonly logger = new Logger(LogoutAllUseCase.name);

  constructor(private readonly authRepo: AuthRepository) {}

  async execute(userId: string): Promise<{ revokedCount: number }> {
    const result = await this.authRepo.revokeAllUserTokens(userId);

    this.logger.log(
      `User ${userId} logged out from all devices (${result.count} tokens revoked)`,
    );

    return { revokedCount: result.count };
  }
}

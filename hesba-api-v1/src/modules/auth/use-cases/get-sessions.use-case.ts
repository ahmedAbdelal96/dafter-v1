// ============================================
// Get Sessions Use Case
// ============================================
// Returns all active sessions (non-revoked, non-expired refresh tokens)
// for the currently authenticated user.
//
// Business Rules:
//   1. Only returns tokens where revokedAt IS NULL and expiresAt > NOW
//   2. tokenHash is NEVER returned — only metadata (id, device, ip, dates)
//   3. Empty array is valid (user just logged in fresh, no old sessions)
// ============================================

import { Injectable } from '@nestjs/common';
import { AuthRepository } from '../auth.repository';

@Injectable()
export class GetSessionsUseCase {
  constructor(private readonly repo: AuthRepository) {}

  async execute(userId: string) {
    return this.repo.findActiveSessions(userId);
  }
}

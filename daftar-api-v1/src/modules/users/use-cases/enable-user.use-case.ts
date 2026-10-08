// ============================================
// Enable User Use Case
// ============================================
// Business Rules:
//   1. Cannot enable a user who doesn't exist
//   2. Already ACTIVE → idempotent, return current state (no error)
//   3. Must check plan user-limit before re-activating:
//      Scenario: 10/10 active; disable 1 → 9/10; create new → 10/10;
//      now re-enabling old user would exceed limit → 403.
// ============================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersRepository } from '../users.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class EnableUserUseCase {
  constructor(
    private readonly repo: UsersRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, userId: string, actorUserId: string) {
    // Verify user exists and belongs to this company
    const user = await this.repo.findById(companyId, userId);
    if (!user) {
      throw new NotFoundException(this.t.translate('users.get.notFound'));
    }

    // Already active — idempotent, return current state
    if (user.status === UserStatus.ACTIVE) {
      const { passwordHash: _removed, ...safeUser } = user;
      return safeUser;
    }

    // Guard: check plan user-limit before re-activating
    const planLimit = await this.repo.getCompanyUserLimit(companyId);
    if (planLimit !== null) {
      const activeCount = await this.repo.countActiveUsers(companyId);
      if (activeCount >= planLimit) {
        throw new ForbiddenException(
          this.t.translate('users.enable.limitReached'),
        );
      }
    }

    const enabled = await this.repo.enableUser(companyId, userId, actorUserId);
    return enabled;
  }
}

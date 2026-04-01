// ============================================
// Disable User Use Case
// ============================================
// Business Rules:
//   1. Cannot disable a user who doesn't exist
//   2. Cannot disable the last active OWNER (company would be locked out)
//   3. An OWNER can disable Staff
// ============================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { UsersRepository } from '../users.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class DisableUserUseCase {
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

    // Already disabled — idempotent, just return current state
    if (user.status === UserStatus.DISABLED) {
      const { passwordHash: _removed, ...safeUser } = user;
      return safeUser;
    }

    // Guard: cannot disable the last active OWNER
    if (user.role === UserRole.OWNER) {
      const ownerCount = await this.repo.countActiveOwners(companyId);
      if (ownerCount <= 1) {
        throw new BadRequestException(
          this.t.translate('users.disable.lastOwner'),
        );
      }
    }

    const disabled = await this.repo.disableUser(
      companyId,
      userId,
      actorUserId,
    );
    return disabled;
  }
}

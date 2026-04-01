// ============================================
// Update Permissions Use Case
// ============================================
// Business Rule: Only STAFF users have permissions.
// Cannot update an OWNER's permissions (they have all).
// ============================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersRepository } from '../users.repository';
import { UpdatePermissionsDto } from '../dto';
import { StaffPermissionsMap } from '../../../common/types';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class UpdatePermissionsUseCase {
  constructor(
    private readonly repo: UsersRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    dto: UpdatePermissionsDto,
    actorUserId: string,
  ) {
    // Verify user exists
    const user = await this.repo.findById(companyId, userId);
    if (!user) {
      throw new NotFoundException(this.t.translate('users.get.notFound'));
    }

    // OWNER doesn't need explicit permissions — they have all access
    if (user.role === UserRole.OWNER) {
      throw new BadRequestException(
        this.t.translate('users.permissions.ownerCannotBeModified'),
      );
    }

    const permissions = await this.repo.updatePermissions(
      companyId,
      userId,
      dto as unknown as StaffPermissionsMap,
      actorUserId,
    );

    return permissions;
  }
}

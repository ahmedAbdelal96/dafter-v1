// ============================================
// Update User Use Case
// ============================================
// Only updates fullName and phone.
// Email and password changes are out of scope.
// ============================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../users.repository';
import { UpdateUserDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    private readonly repo: UsersRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    dto: UpdateUserDto,
    actorUserId: string,
  ) {
    // Verify user exists and belongs to this company
    const existing = await this.repo.findById(companyId, userId);
    if (!existing) {
      throw new NotFoundException(this.t.translate('users.update.notFound'));
    }

    const updated = await this.repo.updateUser(
      companyId,
      userId,
      { fullName: dto.fullName, phone: dto.phone },
      actorUserId,
    );

    return updated;
  }
}

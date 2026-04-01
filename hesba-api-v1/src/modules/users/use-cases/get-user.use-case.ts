// ============================================
// Get User Use Case
// ============================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../users.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetUserUseCase {
  constructor(
    private readonly repo: UsersRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, userId: string) {
    const user = await this.repo.findById(companyId, userId);

    if (!user) {
      throw new NotFoundException(this.t.translate('users.get.notFound'));
    }

    // Strip passwordHash before returning
    const { passwordHash: _removed, ...safeUser } = user;
    return safeUser;
  }
}

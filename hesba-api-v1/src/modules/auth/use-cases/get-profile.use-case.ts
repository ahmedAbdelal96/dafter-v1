// ============================================
// Use Case: Get Profile (بيانات المستخدم الحالي)
// ============================================
// Returns the authenticated user's profile data.
// Includes company info and permissions.
// ============================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthRepository } from '../auth.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { StaffPermissionsMap } from '../../../common/types';

@Injectable()
export class GetProfileUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(userId: string) {
    const user = await this.authRepo.findUserById(userId);

    if (!user || user.isDeleted) {
      throw new NotFoundException(
        this.t.translate('auth.profile.get.notFound'),
      );
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      company: user.company
        ? {
            id: user.company.id,
            name: user.company.name,
          }
        : null,
      permissions: user.permissions
        ? ((user.permissions.permissions as StaffPermissionsMap) ?? null)
        : null,
      createdAt: user.createdAt,
    };
  }
}

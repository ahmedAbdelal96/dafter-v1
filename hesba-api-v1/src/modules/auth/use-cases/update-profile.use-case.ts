// ============================================
// Use Case: Update Profile (تعديل الملف الشخصي)
// ============================================
// Allows an authenticated user to update their own display name
// and phone number. Email is intentionally NOT updatable —
// it's the primary login identifier and changing it would require
// re-verification (out of scope for this endpoint).
// ============================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthRepository } from '../auth.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(userId: string, dto: UpdateProfileDto) {
    const user = await this.authRepo.findUserById(userId);

    if (!user || user.isDeleted) {
      throw new NotFoundException(
        this.t.translate('auth.profile.get.notFound'),
      );
    }

    // Build update payload — only send fields that were supplied
    const updateData: { fullName?: string; phone?: string } = {};
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName.trim();
    // Allow empty string to clear the phone number
    if (dto.phone !== undefined) {
      updateData.phone = dto.phone.trim() || null as any;
    }

    const updated = await this.authRepo.updateUserProfile(userId, updateData);

    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      status: updated.status,
    };
  }
}

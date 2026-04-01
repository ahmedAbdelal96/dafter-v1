// ============================================
// Use Case: Update My Company (تحديث بيانات شركتي)
// ============================================
// Allows a company owner to update their own
// company profile fields.
// Uses optimistic locking (version field) to
// prevent concurrent-write conflicts.
// ============================================

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompaniesRepository } from '../companies.repository';
import { UpdateMyCompanyDto } from '../dto/update-my-company.dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class UpdateMyCompanyUseCase {
  constructor(
    private readonly companiesRepo: CompaniesRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string | null | undefined, dto: UpdateMyCompanyDto) {
    if (!companyId) {
      throw new ForbiddenException(
        this.t.translate('companies.me.noCompany'),
      );
    }

    // Fetch current state for version check
    const existing = await this.companiesRepo.findById(companyId);
    if (!existing) {
      throw new NotFoundException(
        this.t.translate('companies.get.notFound'),
      );
    }

    // Build only the fields that were provided
    const updateData: Record<string, string> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.phone !== undefined) updateData.phone = dto.phone.trim();
    if (dto.address !== undefined) updateData.address = dto.address.trim();
    if (dto.currencyCode !== undefined)
      updateData.currencyCode = dto.currencyCode.trim().toUpperCase();

    // Nothing to update — idempotent return
    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    try {
      return await this.companiesRepo.update(
        companyId,
        updateData,
        existing.version,
      );
    } catch (error) {
      // Prisma throws P2025 when the WHERE clause matches nothing,
      // which happens when version has changed since our read.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(
          this.t.translate('companies.me.versionConflict'),
        );
      }
      throw error;
    }
  }
}

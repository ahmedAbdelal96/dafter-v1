// ============================================
// Use Case: Get My Company (بيانات شركتي)
// ============================================
// Returns the authenticated company owner's own
// company profile, including active subscription.
// ============================================

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CompaniesRepository } from '../companies.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetMyCompanyUseCase {
  constructor(
    private readonly companiesRepo: CompaniesRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string | null | undefined) {
    if (!companyId) {
      throw new ForbiddenException(
        this.t.translate('companies.me.noCompany'),
      );
    }

    const company = await this.companiesRepo.findById(companyId);
    if (!company) {
      throw new NotFoundException(
        this.t.translate('companies.get.notFound'),
      );
    }

    return company;
  }
}

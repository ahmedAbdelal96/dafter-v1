// ============================================
// Use Case: Get Company (تفاصيل شركة)
// ============================================
// Returns full details of a single company,
// including subscription history and entity counts.
// ============================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetCompanyUseCase {
  private readonly logger = new Logger(GetCompanyUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string) {
    const company = await this.platformRepo.findCompanyById(companyId);
    if (!company) {
      throw new NotFoundException(
        this.t.translate('platform.companies.get.notFound'),
      );
    }
    return company;
  }
}

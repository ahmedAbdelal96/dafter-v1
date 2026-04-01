// ============================================
// Use Case: Get Company Metrics (إحصائيات الشركة)
// ============================================
// Returns usage metrics for a specific company.
// Used by Super Admin dashboard to monitor company health.
// ============================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetCompanyMetricsUseCase {
  private readonly logger = new Logger(GetCompanyMetricsUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string) {
    // Validate company exists first
    const company = await this.platformRepo.findCompanyById(companyId);
    if (!company) {
      throw new NotFoundException(
        this.t.translate('platform.companies.metrics.notFound'),
      );
    }

    const metrics = await this.platformRepo.getCompanyMetrics(companyId);
    return {
      companyId,
      companyName: company.name,
      ...metrics,
    };
  }
}

// ============================================
// Use Case: List Companies (قائمة الشركات)
// ============================================
// Returns paginated, filterable list of all companies.
// Supports search by name/phone, filter by status.
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { CompanyQueryDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class ListCompaniesUseCase {
  private readonly logger = new Logger(ListCompaniesUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(query: CompanyQueryDto) {
    const result = await this.platformRepo.findCompanies({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      isActive: query.isActive,
      includeArchived: query.includeArchived,
      archivedOnly: query.archivedOnly,
      subscriptionStatus: query.subscriptionStatus,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
    });

    return result;
  }
}

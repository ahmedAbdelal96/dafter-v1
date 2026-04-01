import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompaniesRepository } from '../companies.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetCashReconciliationModeUseCase {
  constructor(
    private readonly companiesRepo: CompaniesRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string | null | undefined) {
    if (!companyId) {
      throw new ForbiddenException(this.t.translate('companies.me.noCompany'));
    }

    const record = await this.companiesRepo.getCashReconciliationMode(companyId);
    if (!record) {
      throw new NotFoundException(this.t.translate('companies.get.notFound'));
    }

    return record;
  }
}


// ============================================
// Get Supplier Use Case
// ============================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SuppliersRepository } from '../suppliers.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetSupplierUseCase {
  private readonly logger = new Logger(GetSupplierUseCase.name);

  constructor(
    private readonly repo: SuppliersRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, supplierId: string) {
    const supplier = await this.repo.findById(companyId, supplierId);

    if (!supplier) {
      throw new NotFoundException(this.t.translate('suppliers.get.notFound'));
    }

    return supplier;
  }
}

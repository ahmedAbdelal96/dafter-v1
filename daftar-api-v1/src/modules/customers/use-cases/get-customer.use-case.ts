// ============================================
// Get Customer Use Case
// ============================================
// جلب عميل واحد بالـ ID مع رصيده الحالي
// ============================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CustomersRepository } from '../customers.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetCustomerUseCase {
  private readonly logger = new Logger(GetCustomerUseCase.name);

  constructor(
    private readonly repo: CustomersRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @throws NotFoundException - إذا لم يُعثر على العميل
   */
  async execute(companyId: string, customerId: string) {
    const customer = await this.repo.findById(companyId, customerId);

    if (!customer) {
      throw new NotFoundException(this.t.translate('customers.get.notFound'));
    }

    return customer;
  }
}

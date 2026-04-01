// ============================================================
// Use Case: Get Frequent Products for Customer
// (المنتجات الأكثر تكراراً لعميل معين)
// ============================================================
//
// Returns the products most frequently purchased by this customer,
// ranked by appearance in APPROVED invoice items.
// Useful for smart product pre-selection when creating a new invoice.
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomersRepository } from '../customers.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetFrequentProductsUseCase {
  constructor(
    private readonly repo: CustomersRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @throws NotFoundException - Customer not found
   */
  async execute(companyId: string, customerId: string, limit: number) {
    const result = await this.repo.getFrequentProducts(
      companyId,
      customerId,
      Math.min(limit, 20),
    );
    if (result === null) {
      throw new NotFoundException(this.t.translate('customers.get.notFound'));
    }
    return result;
  }
}

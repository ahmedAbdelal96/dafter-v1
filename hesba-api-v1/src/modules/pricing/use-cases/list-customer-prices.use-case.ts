import { Injectable } from '@nestjs/common';
import { PricingRepository } from '../pricing.repository';

@Injectable()
export class ListCustomerPricesUseCase {
  constructor(private readonly repo: PricingRepository) {}

  execute(companyId: string, customerId: string) {
    return this.repo.findForCustomerWithProducts(companyId, customerId);
  }
}

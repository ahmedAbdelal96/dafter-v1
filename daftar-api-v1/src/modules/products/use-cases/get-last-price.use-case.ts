// ============================================================
// Use Case: Get Last Price (آخر سعر بيع لمنتج لعميل)
// ============================================================
//
// Finds the most recent unit price at which this product was
// sold to the given customer (from APPROVED invoices).
// Returns null if no prior sale exists — caller shows catalog price.
// ============================================================

import { Injectable } from '@nestjs/common';
import { ProductsRepository } from '../products.repository';

@Injectable()
export class GetLastPriceUseCase {
  constructor(private readonly repo: ProductsRepository) {}

  async execute(companyId: string, productId: string, customerId: string) {
    return this.repo.getLastPrice(companyId, productId, customerId);
  }
}

// ============================================================
// Use Case: Get Recent Products (المنتجات المستخدمة حديثاً)
// ============================================================
//
// Returns the most recently used distinct products for the company,
// derived from APPROVED invoice items.
// Capped at 20 items.
// ============================================================

import { Injectable } from '@nestjs/common';
import { ProductsRepository } from '../products.repository';

@Injectable()
export class GetRecentProductsUseCase {
  constructor(private readonly repo: ProductsRepository) {}

  async execute(companyId: string, limit: number) {
    return this.repo.getRecentProducts(companyId, Math.min(limit, 20));
  }
}

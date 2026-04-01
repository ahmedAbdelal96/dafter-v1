// ============================================================
// Use Case: Search Products (بحث سريع عن منتج)
// ============================================================
//
// Lightweight typeahead endpoint — matches name or SKU.
// Only active, non-deleted products are returned.
// Limit is capped at 20 to prevent heavy queries from the UI.
// ============================================================

import { Injectable } from '@nestjs/common';
import { ProductsRepository } from '../products.repository';

@Injectable()
export class SearchProductsUseCase {
  constructor(private readonly repo: ProductsRepository) {}

  async execute(companyId: string, q: string, limit: number) {
    return this.repo.search(companyId, q.trim(), Math.min(limit, 20));
  }
}

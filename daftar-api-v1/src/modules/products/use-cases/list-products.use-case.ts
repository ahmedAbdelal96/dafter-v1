// ============================================================
// Use Case: List Products (قائمة منتجات الكتالوج مع فلترة وبحث)
// ============================================================
// Pure delegation to repository — no business logic needed here.
// All filtering/pagination is handled in the repository layer.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ProductsRepository } from '../products.repository';
import { QueryProductDto } from '../dto';

@Injectable()
export class ListProductsUseCase {
  private readonly logger = new Logger(ListProductsUseCase.name);

  constructor(private readonly repo: ProductsRepository) {}

  async execute(companyId: string, query: QueryProductDto) {
    this.logger.debug(
      `Listing products | company: ${companyId} | page: ${query.page ?? 1} | search: "${query.search ?? ''}"`,
    );
    return this.repo.findMany(companyId, query);
  }
}

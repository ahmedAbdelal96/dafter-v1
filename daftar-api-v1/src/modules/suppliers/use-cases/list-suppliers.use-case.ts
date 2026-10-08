// ============================================
// List Suppliers Use Case
// ============================================

import { Injectable } from '@nestjs/common';
import { SuppliersRepository } from '../suppliers.repository';
import { SupplierQueryDto } from '../dto';

type SupplierListRepositoryParams = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

type SupplierListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

@Injectable()
export class ListSuppliersUseCase {
  constructor(private readonly repo: SuppliersRepository) {}

  async execute(companyId: string, query: SupplierQueryDto) {
    const params = this.buildRepositoryParams(query);
    const { data, total, page, limit } = await this.repo.findMany(companyId, params);

    return {
      items: data,
      meta: this.buildMeta(page, limit, total),
    };
  }

  private buildRepositoryParams(
    query: SupplierQueryDto,
  ): SupplierListRepositoryParams {
    return {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      isActive: query.isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as 'asc' | 'desc',
    };
  }

  private buildMeta(page: number, limit: number, total: number): SupplierListMeta {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / (limit || 1)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }
}

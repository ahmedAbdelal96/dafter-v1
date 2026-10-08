// ============================================
// List Customers Use Case
// ============================================
// جلب قائمة العملاء مع pagination + search + balance
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { CustomersRepository } from '../customers.repository';
import { CustomerQueryDto } from '../dto';

type CustomerListRepositoryParams = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

type CustomerListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

@Injectable()
export class ListCustomersUseCase {
  private readonly logger = new Logger(ListCustomersUseCase.name);

  constructor(private readonly repo: CustomersRepository) {}

  async execute(companyId: string, query: CustomerQueryDto) {
    const params = this.buildRepositoryParams(query);
    const { data, total, page, limit } = await this.repo.findMany(
      companyId,
      params,
    );

    return {
      items: data,
      meta: this.buildMeta(page, limit, total),
    };
  }

  private buildRepositoryParams(
    query: CustomerQueryDto,
  ): CustomerListRepositoryParams {
    return {
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      search: query.search,
      isActive: query.isActive,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
    };
  }

  private buildMeta(page: number, limit: number, total: number): CustomerListMeta {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }
}

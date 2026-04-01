// ============================================
// List Customers Use Case
// ============================================
// جلب قائمة العملاء مع pagination + search + balance
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { CustomersRepository } from '../customers.repository';
import { CustomerQueryDto } from '../dto';

@Injectable()
export class ListCustomersUseCase {
  private readonly logger = new Logger(ListCustomersUseCase.name);

  constructor(private readonly repo: CustomersRepository) {}

  async execute(companyId: string, query: CustomerQueryDto) {
    const { data, total, page, limit } = await this.repo.findMany(companyId, {
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      search: query.search,
      isActive: query.isActive,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
    });

    return {
      items: data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}

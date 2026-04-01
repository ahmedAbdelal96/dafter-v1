// ============================================
// List Employees Use Case
// ============================================

import { Injectable } from '@nestjs/common';
import { EmployeesRepository } from '../employees.repository';
import { EmployeeQueryDto } from '../dto';

@Injectable()
export class ListEmployeesUseCase {
  constructor(private readonly repo: EmployeesRepository) {}

  async execute(companyId: string, query: EmployeeQueryDto) {
    const { data, total, page, limit } = await this.repo.findMany(companyId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      isActive: query.isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as 'asc' | 'desc',
    });

    return {
      items: data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / (limit || 1)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}

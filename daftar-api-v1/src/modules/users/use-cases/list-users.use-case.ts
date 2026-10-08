// ============================================
// List Users Use Case
// ============================================

import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users.repository';
import { UserQueryDto } from '../dto';
import { PaginationMeta } from '../../../common/types/common.types';

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly repo: UsersRepository) {}

  async execute(companyId: string, query: UserQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { users, total } = await this.repo.findMany(companyId, {
      page,
      limit,
      search: query.search,
      status: query.status,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as 'asc' | 'desc',
    });

    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    return { items: users, meta };
  }
}

// ============================================
// Get Stats Use Case
// ============================================

import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users.repository';

@Injectable()
export class GetStatsUseCase {
  constructor(private readonly repo: UsersRepository) {}

  async execute(companyId: string) {
    const stats = await this.repo.getStats(companyId);
    return stats;
  }
}

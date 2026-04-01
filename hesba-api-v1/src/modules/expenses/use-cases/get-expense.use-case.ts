// ============================================================
// Use Case: Get Expense by ID (تفاصيل مصروف)
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpensesRepository } from '../expenses.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetExpenseUseCase {
  constructor(
    private readonly repo: ExpensesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * Fetches a single expense by ID, scoped to the company (tenant isolation).
   * Throws 404 if not found or soft-deleted.
   */
  async execute(companyId: string, id: string) {
    const expense = await this.repo.findOne(id, companyId);
    if (!expense) {
      throw new NotFoundException(this.t.translate('expenses.notFound'));
    }
    return expense;
  }
}

// ============================================================
// Use Case: List Expenses (قائمة المصروفات)
// ============================================================

import { Injectable } from '@nestjs/common';
import { ExpensesRepository } from '../expenses.repository';
import { QueryExpenseDto } from '../dto';

@Injectable()
export class ListExpensesUseCase {
  constructor(private readonly repo: ExpensesRepository) {}

  /**
   * Returns a paginated, filtered list of expenses for the given company.
   * Supports filtering by category, date range, and free-text search.
   */
  async execute(companyId: string, query: QueryExpenseDto) {
    return this.repo.findMany(companyId, query);
  }
}

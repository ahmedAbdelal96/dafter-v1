// ============================================================
// Use Case: Get Expense Summary (ملخص المصروفات)
// ============================================================
// Returns total spend + breakdown by category for the given
// date range and optional filters — drives the analytics screen.
// ============================================================

import { Injectable } from '@nestjs/common';
import { ExpensesRepository } from '../expenses.repository';
import { QueryExpenseDto } from '../dto';

@Injectable()
export class GetExpenseSummaryUseCase {
  constructor(private readonly repo: ExpensesRepository) {}

  /**
   * Aggregates expense totals per category for the given company.
   * Accepts the same filter parameters as the list endpoint so the
   * dashboard can show a summary for "this month" or any custom range.
   */
  async execute(companyId: string, query: QueryExpenseDto) {
    return this.repo.getSummary(companyId, query);
  }
}

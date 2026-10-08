// ============================================================
// Expenses Service — Thin Orchestration Layer
// ============================================================
// The service owns no business logic. It delegates every
// operation to the appropriate Use Case so each use case
// remains independently testable and single-responsibility.
// ============================================================

import { Injectable } from '@nestjs/common';
import { CreateExpenseDto, UpdateExpenseDto, QueryExpenseDto } from './dto';
import {
  CreateExpenseUseCase,
  ListExpensesUseCase,
  GetExpenseUseCase,
  UpdateExpenseUseCase,
  DeleteExpenseUseCase,
  GetExpenseSummaryUseCase,
} from './use-cases';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly createExpenseUseCase: CreateExpenseUseCase,
    private readonly listExpensesUseCase: ListExpensesUseCase,
    private readonly getExpenseUseCase: GetExpenseUseCase,
    private readonly updateExpenseUseCase: UpdateExpenseUseCase,
    private readonly deleteExpenseUseCase: DeleteExpenseUseCase,
    private readonly getExpenseSummaryUseCase: GetExpenseSummaryUseCase,
  ) {}

  create(companyId: string, userId: string, dto: CreateExpenseDto) {
    return this.createExpenseUseCase.execute(companyId, userId, dto);
  }

  findAll(companyId: string, query: QueryExpenseDto) {
    return this.listExpensesUseCase.execute(companyId, query);
  }

  findOne(companyId: string, id: string) {
    return this.getExpenseUseCase.execute(companyId, id);
  }

  update(companyId: string, userId: string, id: string, dto: UpdateExpenseDto) {
    return this.updateExpenseUseCase.execute(companyId, userId, id, dto);
  }

  remove(companyId: string, userId: string, id: string) {
    return this.deleteExpenseUseCase.execute(companyId, userId, id);
  }

  getSummary(companyId: string, query: QueryExpenseDto) {
    return this.getExpenseSummaryUseCase.execute(companyId, query);
  }
}

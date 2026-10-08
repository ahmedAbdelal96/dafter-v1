// ============================================================
// Use Case: Delete Expense (حذف مصروف — soft delete)
// ============================================================
// Steps:
//   1. Verify expense exists (404 if not)
//   2. Inside $transaction:
//      a. Soft-delete (isDeleted=true, deletedAt=now)
//      b. AuditLog { action: 'expense.delete' }
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExpensesRepository } from '../expenses.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class DeleteExpenseUseCase {
  private readonly logger = new Logger(DeleteExpenseUseCase.name);

  constructor(
    private readonly repo: ExpensesRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, userId: string, id: string): Promise<void> {
    // ── Step 1: Verify expense exists ────────────────────────────────────
    const existing = await this.repo.findOne(id, companyId);
    if (!existing) {
      throw new NotFoundException(this.t.translate('expenses.notFound'));
    }

    // ── Step 2: Atomic transaction ────────────────────────────────────────
    await this.repo.withTransaction(undefined, async (tx) => {
      await this.repo.softDelete(id, companyId, tx);

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'expense.delete',
        entityType: 'expense',
        entityId: id,
        metadata: {
          category: existing.category,
          amount: existing.amount.toString(),
          expenseDate: existing.expenseDate,
        },
      });

      this.logger.log(`Expense soft-deleted: ${id} | actor: ${userId}`);
    });
  }
}

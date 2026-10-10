// ============================================================
// Use Case: Create Expense (تسجيل مصروف)
// ============================================================
// Steps:
//   1. Inside $transaction:
//      a. Create Expense record
//      b. AuditLog { action: 'expense.create' }
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExpensesRepository } from '../expenses.repository';
import { CreateExpenseDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CreateExpenseUseCase {
  private readonly logger = new Logger(CreateExpenseUseCase.name);

  constructor(
    private readonly repo: ExpensesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * Records a new business expense.
   *
   * The write (Expense + AuditLog) runs inside a single $transaction.
   */
  async execute(companyId: string, userId: string, dto: CreateExpenseDto) {
    // ── Step 1: Parse date (strip time component) ─────────────────────────
    const expenseDate = new Date(dto.expenseDate);
    expenseDate.setUTCHours(0, 0, 0, 0);

    // ── Step 3: Atomic transaction ────────────────────────────────────────
    const expense = await this.repo.withTransaction(undefined, async (tx) => {
      // Step 3a: Create expense
      const created = await this.repo.create(
        {
          companyId,
          createdById: userId,
          category: dto.category,
          amount: new Prisma.Decimal(dto.amount),
          expenseDate,
          description: dto.description,
          referenceNumber: dto.referenceNumber,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
        },
        tx,
      );

      // Step 3b: AuditLog
      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'expense.create',
        entityType: 'expense',
        entityId: created.id,
        metadata: {
          category: dto.category,
          amount: dto.amount.toString(),
          expenseDate: expenseDate.toISOString().split('T')[0],
        },
      });

      this.logger.log(
        `Expense created: ${created.id} | category: ${dto.category} | ` +
          `amount: ${dto.amount} | actor: ${userId}`,
      );

      return created;
    });

    return expense;
  }
}

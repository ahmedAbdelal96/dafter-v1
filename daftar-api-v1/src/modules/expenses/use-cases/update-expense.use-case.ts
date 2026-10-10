// ============================================================
// Use Case: Update Expense (تعديل مصروف)
// ============================================================
// Steps:
//   1. Verify expense exists (404 if not)
//   2. Inside $transaction:
//      a. updateMany (company-scoped)
//      b. AuditLog { action: 'expense.update' }
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExpensesRepository, UpdateExpenseData } from '../expenses.repository';
import { UpdateExpenseDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UpdateExpenseUseCase {
  private readonly logger = new Logger(UpdateExpenseUseCase.name);

  constructor(
    private readonly repo: ExpensesRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateExpenseDto,
  ) {
    // ── Step 1: Verify expense exists ────────────────────────────────────
    const existing = await this.repo.findOne(id, companyId);
    if (!existing) {
      throw new NotFoundException(this.t.translate('expenses.notFound'));
    }

    // ── Step 2: Build update payload ──────────────────────────────────────
    const updateData: UpdateExpenseData = {};

    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.amount !== undefined)
      updateData.amount = new Prisma.Decimal(dto.amount);
    if (dto.expenseDate !== undefined) {
      const d = new Date(dto.expenseDate);
      d.setUTCHours(0, 0, 0, 0);
      updateData.expenseDate = d;
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.referenceNumber !== undefined)
      updateData.referenceNumber = dto.referenceNumber;
    if (dto.paymentMethod !== undefined)
      updateData.paymentMethod = dto.paymentMethod;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // ── Step 4: Atomic transaction ────────────────────────────────────────
    const updated = await this.repo.withTransaction(undefined, async (tx) => {
      const result = await this.repo.update(id, companyId, updateData, tx);

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'expense.update',
        entityType: 'expense',
        entityId: id,
        metadata: { changes: dto as Record<string, unknown> },
      });

      this.logger.log(
        `Expense updated: ${id} | actor: ${userId} | changes: ${JSON.stringify(dto)}`,
      );

      return result;
    });

    return updated;
  }
}

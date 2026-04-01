// ============================================================
// Use Case: Create Expense (تسجيل مصروف)
// ============================================================
// Steps:
//   1. Validate supplier exists (if supplierId provided)
//   2. Inside $transaction:
//      a. Create Expense record
//      b. AuditLog { action: 'expense.create' }
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ExpensesRepository } from '../expenses.repository';
import { CreateExpenseDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CreateExpenseUseCase {
  private readonly logger = new Logger(CreateExpenseUseCase.name);

  constructor(
    private readonly repo: ExpensesRepository,
    private readonly prisma: PrismaService,
    private readonly t: TranslationService,
  ) {}

  /**
   * Records a new business expense.
   *
   * If `supplierId` is provided we verify the supplier belongs to this company
   * before persisting — prevents cross-tenant data leakage.
   * The write (Expense + AuditLog) runs inside a single $transaction.
   */
  async execute(companyId: string, userId: string, dto: CreateExpenseDto) {
    // ── Step 1: Validate supplier (if given) ─────────────────────────────
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, companyId, isDeleted: false },
        select: { id: true },
      });
      if (!supplier) {
        throw new NotFoundException(
          this.t.translate('expenses.supplierNotFound'),
        );
      }
    }

    // ── Step 2: Parse date (strip time component) ─────────────────────────
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
          supplierId: dto.supplierId,
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
          supplierId: dto.supplierId ?? null,
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

// ============================================================
// Use Case: Delete Product (حذف منتج — soft delete)
// ============================================================
// Steps:
//   1. Verify product exists (404 if not).
//   2. Inside $transaction:
//      a. Soft-delete (isDeleted = true, deletedAt = now).
//      b. Write AuditLog.
//
// Note: soft delete is used so historical references in future
// InvoiceItems (Phase K) remain valid after a product is removed.
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProductsRepository } from '../products.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class DeleteProductUseCase {
  private readonly logger = new Logger(DeleteProductUseCase.name);

  constructor(
    private readonly repo: ProductsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, userId: string, id: string) {
    // ── Step 1: Verify exists ─────────────────────────────────────────────
    const existing = await this.repo.findOne(id, companyId);
    if (!existing) {
      throw new NotFoundException(this.t.translate('products.get.notFound'));
    }

    // ── Step 2: Atomic soft-delete + AuditLog ─────────────────────────────
    await this.repo.withTransaction(undefined, async (tx) => {
      await this.repo.softDelete(id, companyId, tx);

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'product.delete',
        entityType: 'product',
        entityId: id,
        metadata: {
          name: existing.name,
          sku: existing.sku,
        },
      });

      this.logger.log(
        `Product soft-deleted: ${id} | name: "${existing.name}" | actor: ${userId}`,
      );
    });

    return null;
  }
}

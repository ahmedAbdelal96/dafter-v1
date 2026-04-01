// ============================================
// Delete Supplier Use Case
// ============================================
// Business Rules:
//   1. Supplier must exist and belong to this company
//   2. Cannot delete if supplier has ledger entries
//      → user should disable instead
//   3. Soft delete: sets isDeleted=true + deletedAt
//   4. AuditLog written inside transaction
// ============================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SuppliersRepository } from '../suppliers.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class DeleteSupplierUseCase {
  private readonly logger = new Logger(DeleteSupplierUseCase.name);

  constructor(
    private readonly repo: SuppliersRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, actorUserId: string, supplierId: string) {
    // ── Rule 1: Verify supplier exists ────────────────────────────────────
    const supplier = await this.repo.findById(companyId, supplierId);
    if (!supplier) {
      throw new NotFoundException(
        this.t.translate('suppliers.delete.notFound'),
      );
    }

    // ── Rule 2: Block delete if ledger entries exist ──────────────────────
    const hasEntries = await this.repo.hasLedgerEntries(companyId, supplierId);
    if (hasEntries) {
      throw new ConflictException(
        this.t.translate('suppliers.delete.hasEntries'),
      );
    }

    // ── Rule 3: Soft delete ───────────────────────────────────────────────
    await this.repo.softDelete(companyId, supplierId, actorUserId);

    this.logger.log(`Supplier ${supplierId} soft-deleted by ${actorUserId}`);

    return { id: supplierId, deleted: true };
  }
}

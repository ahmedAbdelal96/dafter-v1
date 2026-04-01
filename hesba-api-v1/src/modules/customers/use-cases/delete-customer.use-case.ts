// ============================================
// Delete Customer Use Case
// ============================================
// Business Rules:
//   1. Customer must exist and belong to this company
//   2. Cannot delete if customer has ledger entries
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
import { CustomersRepository } from '../customers.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class DeleteCustomerUseCase {
  private readonly logger = new Logger(DeleteCustomerUseCase.name);

  constructor(
    private readonly repo: CustomersRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @throws NotFoundException - العميل غير موجود
   * @throws ConflictException - لديه حركات مالية لا يمكن حذفه
   */
  async execute(companyId: string, actorUserId: string, customerId: string) {
    // ── Rule 1: Verify customer exists ───────────────────────────────────
    const customer = await this.repo.findById(companyId, customerId);
    if (!customer) {
      throw new NotFoundException(
        this.t.translate('customers.delete.notFound'),
      );
    }

    // ── Rule 2: Block delete if ledger entries exist ──────────────────────
    const hasEntries = await this.repo.hasLedgerEntries(companyId, customerId);
    if (hasEntries) {
      throw new ConflictException(
        this.t.translate('customers.delete.hasEntries'),
      );
    }

    // ── Rule 3: Soft delete ───────────────────────────────────────────────
    await this.repo.softDelete(companyId, customerId, actorUserId);

    this.logger.log(`Customer ${customerId} soft-deleted by ${actorUserId}`);

    return { id: customerId, deleted: true };
  }
}

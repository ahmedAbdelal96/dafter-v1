// ============================================
// Delete Employee Use Case
// ============================================
// Business Rules:
//   1. Employee must exist and belong to this company
//   2. Cannot delete if employee has ledger entries
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
import { EmployeesRepository } from '../employees.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class DeleteEmployeeUseCase {
  private readonly logger = new Logger(DeleteEmployeeUseCase.name);

  constructor(
    private readonly repo: EmployeesRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, actorUserId: string, employeeId: string) {
    // ── Rule 1: Verify employee exists ────────────────────────────────────
    const employee = await this.repo.findById(companyId, employeeId);
    if (!employee) {
      throw new NotFoundException(
        this.t.translate('employees.delete.notFound'),
      );
    }

    // ── Rule 2: Block delete if ledger entries exist ──────────────────────
    const hasEntries = await this.repo.hasLedgerEntries(companyId, employeeId);
    if (hasEntries) {
      throw new ConflictException(
        this.t.translate('employees.delete.hasEntries'),
      );
    }

    // ── Rule 3: Soft delete ───────────────────────────────────────────────
    await this.repo.softDelete(companyId, employeeId, actorUserId);

    this.logger.log(`Employee ${employeeId} soft-deleted by ${actorUserId}`);

    return { id: employeeId, deleted: true };
  }
}

// ============================================
// Update Employee Use Case
// ============================================
// Business Rules:
//   1. Employee must exist and belong to this company
//   2. If name changes → check uniqueness
//   3. Optimistic locking: version must match DB
//      → 0 rows updated = 409 Conflict
// ============================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EmployeesRepository } from '../employees.repository';
import { UpdateEmployeeDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class UpdateEmployeeUseCase {
  private readonly logger = new Logger(UpdateEmployeeUseCase.name);

  constructor(
    private readonly repo: EmployeesRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(
    companyId: string,
    actorUserId: string,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ) {
    // ── Rule 1: Verify employee exists ────────────────────────────────────
    const existing = await this.repo.findById(companyId, employeeId);
    if (!existing) {
      throw new NotFoundException(
        this.t.translate('employees.update.notFound'),
      );
    }

    // ── Rule 2: Name uniqueness check (only if name changed) ──────────────
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const nameExists = await this.repo.existsByName(
        companyId,
        dto.name,
        employeeId, // exclude self
      );
      if (nameExists) {
        throw new ConflictException(
          this.t.translate('employees.update.nameExists'),
        );
      }
    }

    // ── Rule 3: Update with Optimistic Locking ────────────────────────────
    const updatedCount = await this.repo.update(
      companyId,
      employeeId,
      dto.version,
      {
        name: dto.name,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        isActive: dto.isActive,
      },
      actorUserId,
    );

    // 0 rows updated = version mismatch (race condition)
    if (updatedCount === 0) {
      throw new ConflictException(
        this.t.translate('employees.update.conflict'),
      );
    }

    this.logger.log(`Employee ${employeeId} updated by ${actorUserId}`);

    // Return fresh data after update
    return this.repo.findById(companyId, employeeId);
  }
}

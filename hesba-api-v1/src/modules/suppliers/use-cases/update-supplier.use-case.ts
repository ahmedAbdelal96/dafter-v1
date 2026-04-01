// ============================================
// Update Supplier Use Case
// ============================================
// Business Rules:
//   1. Supplier must exist and belong to this company
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
import { SuppliersRepository } from '../suppliers.repository';
import { UpdateSupplierDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class UpdateSupplierUseCase {
  private readonly logger = new Logger(UpdateSupplierUseCase.name);

  constructor(
    private readonly repo: SuppliersRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(
    companyId: string,
    actorUserId: string,
    supplierId: string,
    dto: UpdateSupplierDto,
  ) {
    // ── Rule 1: Verify supplier exists ────────────────────────────────────
    const existing = await this.repo.findById(companyId, supplierId);
    if (!existing) {
      throw new NotFoundException(
        this.t.translate('suppliers.update.notFound'),
      );
    }

    // ── Rule 2: Name uniqueness check (only if name changed) ──────────────
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const nameExists = await this.repo.existsByName(
        companyId,
        dto.name,
        supplierId, // exclude self
      );
      if (nameExists) {
        throw new ConflictException(
          this.t.translate('suppliers.update.nameExists'),
        );
      }
    }

    // ── Rule 3: Update with Optimistic Locking ────────────────────────────
    const updatedCount = await this.repo.update(
      companyId,
      supplierId,
      dto.version,
      {
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        isActive: dto.isActive,
      },
      actorUserId,
    );

    // 0 rows updated = version mismatch (race condition)
    if (updatedCount === 0) {
      throw new ConflictException(
        this.t.translate('suppliers.update.conflict'),
      );
    }

    this.logger.log(`Supplier ${supplierId} updated by ${actorUserId}`);

    // Return fresh data with updated version
    return this.repo.findById(companyId, supplierId);
  }
}

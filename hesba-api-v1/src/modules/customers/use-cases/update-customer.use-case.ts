// ============================================
// Update Customer Use Case
// ============================================
// Business Rules:
//   1. Customer must exist and belong to this company
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
import { CustomersRepository } from '../customers.repository';
import { UpdateCustomerDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class UpdateCustomerUseCase {
  private readonly logger = new Logger(UpdateCustomerUseCase.name);

  constructor(
    private readonly repo: CustomersRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @param companyId - من JWT
   * @param actorUserId - من JWT
   * @param customerId - من URL param
   * @param dto - البيانات المراد تعديلها + version مطلوب
   * @param lang - لغة الرسائل
   * @throws NotFoundException - العميل غير موجود
   * @throws ConflictException - اسم مكرر أو version mismatch
   */
  async execute(
    companyId: string,
    actorUserId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ) {
    // ── Rule 1: Verify customer exists ───────────────────────────────────
    const existing = await this.repo.findById(companyId, customerId);
    if (!existing) {
      throw new NotFoundException(
        this.t.translate('customers.update.notFound'),
      );
    }

    // ── Rule 2: Name uniqueness check (only if name changed) ──────────────
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const nameExists = await this.repo.existsByName(
        companyId,
        dto.name,
        customerId, // exclude self
      );
      if (nameExists) {
        throw new ConflictException(
          this.t.translate('customers.update.nameExists'),
        );
      }
    }

    // ── Rule 3: Update with Optimistic Locking ────────────────────────────
    const updatedCount = await this.repo.update(
      companyId,
      customerId,
      dto.version,
      {
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        // null explicitly clears the field; undefined = no change
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        isActive: dto.isActive,
      },
      actorUserId,
    );

    // 0 rows updated = version mismatch (race condition)
    if (updatedCount === 0) {
      throw new ConflictException(
        this.t.translate('customers.update.conflict'),
      );
    }

    this.logger.log(`Customer ${customerId} updated by ${actorUserId}`);

    // Return fresh data with updated version
    return this.repo.findById(companyId, customerId);
  }
}

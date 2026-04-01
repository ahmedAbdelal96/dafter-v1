// ============================================
// Use Case: Update Plan (تحديث خطة اشتراك)
// ============================================
// Super Admin updates an existing plan's configuration.
// Note: Changing limits affects all existing subscribers.
// Flow:
//  1. Validate plan exists
//  2. Check name uniqueness if name is being changed
//  3. Persist update
// ============================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { UpdatePlanDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class UpdatePlanUseCase {
  private readonly logger = new Logger(UpdatePlanUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(planId: string, dto: UpdatePlanDto) {
    // Step 1: Validate plan exists
    const plan = await this.platformRepo.findPlanById(planId);
    if (!plan) {
      throw new NotFoundException(
        this.t.translate('platform.plans.update.notFound'),
      );
    }

    // Step 2: Check name uniqueness if name is being changed
    if (dto.name) {
      const normalized = dto.name.toUpperCase().trim();
      const existing = await this.platformRepo.findPlanByName(normalized);
      if (existing && existing.id !== planId) {
        throw new ConflictException(
          this.t.translate('platform.plans.update.nameExists'),
        );
      }
    }

    // Step 3: Build update payload
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name.toUpperCase().trim();
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.currencyCode !== undefined)
      updateData.currencyCode = dto.currencyCode;
    if (dto.billingCycle !== undefined)
      updateData.billingCycle = dto.billingCycle;
    if (dto.maxUsers !== undefined) updateData.maxUsers = dto.maxUsers;
    if (dto.maxCustomers !== undefined)
      updateData.maxCustomers = dto.maxCustomers;
    if (dto.maxSuppliers !== undefined)
      updateData.maxSuppliers = dto.maxSuppliers;
    if (dto.maxEmployees !== undefined)
      updateData.maxEmployees = dto.maxEmployees;
    if (dto.maxLedgerEntries !== undefined)
      updateData.maxLedgerEntries = dto.maxLedgerEntries
        ? BigInt(dto.maxLedgerEntries)
        : null;
    if (dto.features !== undefined)
      updateData.features = JSON.stringify(dto.features);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.platformRepo.updatePlan(planId, updateData);

    // Serialize BigInt for JSON
    return {
      ...updated,
      maxLedgerEntries: updated.maxLedgerEntries
        ? Number(updated.maxLedgerEntries)
        : null,
    };
  }
}

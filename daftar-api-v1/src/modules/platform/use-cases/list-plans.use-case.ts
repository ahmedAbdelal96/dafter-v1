// ============================================
// Use Case: List Plans (قائمة الخطط)
// ============================================
// Returns all subscription plans.
// Super Admin can choose to include inactive plans.
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class ListPlansUseCase {
  private readonly logger = new Logger(ListPlansUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(includeInactive = false) {
    const plans = await this.platformRepo.findPlans(includeInactive);

    // Serialize BigInt fields for JSON output
    return plans.map((plan) => ({
      ...plan,
      maxLedgerEntries: plan.maxLedgerEntries
        ? Number(plan.maxLedgerEntries)
        : null,
    }));
  }
}

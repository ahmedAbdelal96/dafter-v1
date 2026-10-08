// ============================================
// Use Case: Create Plan (إنشاء خطة اشتراك)
// ============================================
// Super Admin creates a new subscription plan.
// Flow:
//  1. Check plan name uniqueness (normalized to UPPERCASE)
//  2. Persist to database
// ============================================

import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { CreatePlanDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class CreatePlanUseCase {
  private readonly logger = new Logger(CreatePlanUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(dto: CreatePlanDto) {
    // Step 1: Check name uniqueness (repo normalizes to UPPERCASE)
    const existing = await this.platformRepo.findPlanByName(dto.name);
    if (existing) {
      throw new ConflictException(
        this.t.translate('platform.plans.create.nameExists'),
      );
    }

    // Step 2: Create plan
    let plan;
    try {
      plan = await this.platformRepo.createPlan({
        name: dto.name,
        price: dto.price,
        currencyCode: dto.currencyCode,
        billingCycle: dto.billingCycle,
        maxUsers: dto.maxUsers,
        maxCustomers: dto.maxCustomers,
        maxSuppliers: dto.maxSuppliers,
        maxEmployees: dto.maxEmployees,
        maxLedgerEntries: dto.maxLedgerEntries,
        features: dto.features,
        isActive: dto.isActive,
      });
    } catch (error) {
      this.logger.error(`Failed to create plan: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        this.t.translate('platform.plans.create.failed'),
      );
    }

    // Serialize BigInt for JSON output
    return {
      ...plan,
      maxLedgerEntries: plan.maxLedgerEntries
        ? Number(plan.maxLedgerEntries)
        : null,
    };
  }
}

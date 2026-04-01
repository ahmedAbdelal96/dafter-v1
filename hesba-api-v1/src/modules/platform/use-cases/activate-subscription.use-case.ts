// ============================================
// Use Case: Activate Subscription (تفعيل اشتراك)
// ============================================
// Super Admin manually activates or upgrades a company's subscription.
// Expires any existing active/trial subscription first.
// Flow:
//  1. Validate company exists
//  2. Validate plan exists and is active
//  3. Activate subscription (atomic: expire old → create new → audit)
// ============================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlatformRepository } from '../platform.repository';
import { ActivateSubscriptionDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { PlatformSettingsService } from '../platform-settings.service';

@Injectable()
export class ActivateSubscriptionUseCase {
  private readonly logger = new Logger(ActivateSubscriptionUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly t: TranslationService,
  ) {}

  async execute(dto: ActivateSubscriptionDto, actorUserId: string) {
    // Step 1: Validate company exists
    const company = await this.platformRepo.findCompanyById(dto.companyId);
    if (!company) {
      throw new NotFoundException(
        this.t.translate('platform.subscriptions.activate.companyNotFound'),
      );
    }

    // Step 2: Validate plan exists and is active
    const plan = await this.platformRepo.findPlanById(dto.planId);
    if (!plan || !plan.isActive) {
      throw new NotFoundException(
        this.t.translate('platform.subscriptions.activate.planNotFound'),
      );
    }

    // Step 3: Enforce global plan-transition policy (upgrade/downgrade).
    const platformSettings = await this.platformSettingsService.getSettings();
    const currentSubscription = await this.platformRepo.findActiveSubscription(
      dto.companyId,
    );
    const currentPlan = currentSubscription?.plan ?? null;

    if (currentPlan && currentPlan.id !== plan.id) {
      const currentPrice = Number(currentPlan.price);
      const nextPrice = Number(plan.price);

      const isUpgrade = nextPrice > currentPrice;
      const isDowngrade = nextPrice < currentPrice;

      if (
        isUpgrade &&
        platformSettings.subscriptionPolicies.allowPlanUpgrade === false
      ) {
        throw new BadRequestException(
          this.t.translate('platform.subscriptions.activate.upgradeNotAllowed'),
        );
      }

      if (
        isDowngrade &&
        platformSettings.subscriptionPolicies.allowPlanDowngrade === false
      ) {
        throw new BadRequestException(
          this.t.translate('platform.subscriptions.activate.downgradeNotAllowed'),
        );
      }
    }

    // Step 4: Validate end date is in the future (defense-in-depth).
    const endDate = new Date(dto.endDate);
    if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) {
      throw new BadRequestException(
        this.t.translate('platform.subscriptions.extend.invalidDate'),
      );
    }

    // Step 5: Activate subscription
    let subscription;
    try {
      subscription = await this.platformRepo.activateSubscription({
        companyId: dto.companyId,
        planId: dto.planId,
        endDate,
        autoRenew: dto.autoRenew ?? false,
        actorUserId,
        note: dto.note,
      });
    } catch (error) {
      const maybePrismaError = error as
        | Prisma.PrismaClientKnownRequestError
        | { code?: string }
        | undefined;
      if (maybePrismaError?.code === 'P2002') {
        throw new ConflictException({
          code: 'LIVE_SUBSCRIPTION_CONFLICT',
          message:
            'Subscription lifecycle conflict detected. Please retry the request.',
        });
      }
      this.logger.error(
        `Failed to activate subscription: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        this.t.translate('platform.subscriptions.activate.failed'),
      );
    }

    return subscription;
  }
}

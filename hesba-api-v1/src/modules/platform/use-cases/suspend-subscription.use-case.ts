// ============================================
// Use Case: Suspend Subscription (تعليق الاشتراك)
// ============================================
// Super Admin suspends a company's active subscription.
// Company enters read-only mode until reactivated.
// Flow:
//  1. Validate company exists
//  2. Suspend active subscription (returns null if none active)
//  3. Throw if no active subscription found
// ============================================

import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { SuspendSubscriptionDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class SuspendSubscriptionUseCase {
  private readonly logger = new Logger(SuspendSubscriptionUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(dto: SuspendSubscriptionDto, actorUserId: string) {
    // Step 1: Validate company exists
    const company = await this.platformRepo.findCompanyById(dto.companyId);
    if (!company) {
      throw new NotFoundException(
        this.t.translate('platform.subscriptions.suspend.companyNotFound'),
      );
    }

    // Step 2: Suspend subscription
    let subscription;
    try {
      subscription = await this.platformRepo.suspendSubscription({
        companyId: dto.companyId,
        actorUserId,
        reason: dto.reason,
      });
    } catch (error) {
      this.logger.error(
        `Failed to suspend subscription: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        this.t.translate('platform.subscriptions.suspend.failed'),
      );
    }

    // Step 3: Handle no active subscription
    if (!subscription) {
      throw new NotFoundException(
        this.t.translate('platform.subscriptions.suspend.noActiveSubscription'),
      );
    }

    return subscription;
  }
}

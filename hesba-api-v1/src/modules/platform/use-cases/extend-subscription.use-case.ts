// ============================================
// Use Case: Extend Subscription (تمديد الاشتراك)
// ============================================
// Super Admin extends a company's subscription end date.
// Can reactivate a suspended/expired subscription.
// Flow:
//  1. Validate company exists
//  2. Validate new end date is in the future
//  3. Extend subscription (returns null if no subscription exists)
// ============================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { ExtendSubscriptionDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class ExtendSubscriptionUseCase {
  private readonly logger = new Logger(ExtendSubscriptionUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(dto: ExtendSubscriptionDto, actorUserId: string) {
    // Step 1: Validate company exists
    const company = await this.platformRepo.findCompanyById(dto.companyId);
    if (!company) {
      throw new NotFoundException(
        this.t.translate('platform.subscriptions.extend.companyNotFound'),
      );
    }

    // Step 2: Validate new end date is in the future
    const newEndDate = new Date(dto.newEndDate);
    if (newEndDate <= new Date()) {
      throw new BadRequestException(
        this.t.translate('platform.subscriptions.extend.invalidDate'),
      );
    }

    // Step 3: Extend subscription
    let subscription;
    try {
      subscription = await this.platformRepo.extendSubscription({
        companyId: dto.companyId,
        newEndDate,
        actorUserId,
        reason: dto.reason,
      });
    } catch (error) {
      this.logger.error(
        `Failed to extend subscription: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        this.t.translate('platform.subscriptions.extend.failed'),
      );
    }

    // Handle no subscription found
    if (!subscription) {
      throw new NotFoundException(
        this.t.translate('platform.subscriptions.extend.noSubscription'),
      );
    }

    return subscription;
  }
}

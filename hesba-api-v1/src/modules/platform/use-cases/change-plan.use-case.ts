import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlatformRepository } from '../platform.repository';
import { ChangePlanDto, ChangePlanMode } from '../dto';
import { PlatformSettingsService } from '../platform-settings.service';

@Injectable()
export class ChangePlanUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  async execute(dto: ChangePlanDto, actorUserId: string) {
    if (process.env.FEATURE_CHANGE_PLAN_IMMEDIATE_ENABLED === 'false') {
      throw new BadRequestException({
        code: 'CHANGE_PLAN_DISABLED',
        message: 'Change-plan workflow is currently disabled by feature flag.',
      });
    }

    if ((dto.mode ?? ChangePlanMode.IMMEDIATE) !== ChangePlanMode.IMMEDIATE) {
      throw new BadRequestException({
        code: 'CHANGE_PLAN_MODE_NOT_SUPPORTED',
        message: 'Only IMMEDIATE mode is supported in this phase.',
      });
    }

    const company = await this.platformRepo.findCompanyByIdBasic(dto.companyId);
    if (!company) {
      throw new NotFoundException({
        code: 'COMPANY_NOT_FOUND',
        message: 'Company not found.',
      });
    }

    const nextPlan = await this.platformRepo.findPlanById(dto.newPlanId);
    if (!nextPlan || !nextPlan.isActive) {
      throw new NotFoundException({
        code: 'PLAN_NOT_FOUND',
        message: 'Target plan not found or inactive.',
      });
    }

    const currentSubscription = await this.platformRepo.findActiveSubscription(
      dto.companyId,
    );
    if (!currentSubscription) {
      throw new NotFoundException({
        code: 'LIVE_SUBSCRIPTION_NOT_FOUND',
        message: 'No live subscription found for this company.',
      });
    }

    if (currentSubscription.planId === dto.newPlanId) {
      throw new BadRequestException({
        code: 'PLAN_ALREADY_ACTIVE',
        message: 'Company is already on this plan.',
      });
    }

    const now = new Date();
    if (currentSubscription.endDate <= now) {
      throw new ConflictException({
        code: 'LIVE_SUBSCRIPTION_EXPIRED',
        message:
          'Current live subscription is already expired. Activate a new subscription instead.',
      });
    }

    const settings = await this.platformSettingsService.getSettings();
    const currentPrice = Number(currentSubscription.plan.price);
    const nextPrice = Number(nextPlan.price);

    if (
      nextPrice > currentPrice &&
      settings.subscriptionPolicies.allowPlanUpgrade === false
    ) {
      throw new BadRequestException({
        code: 'UPGRADE_NOT_ALLOWED',
        message: 'Plan upgrade is disabled by policy.',
      });
    }

    if (
      nextPrice < currentPrice &&
      settings.subscriptionPolicies.allowPlanDowngrade === false
    ) {
      throw new BadRequestException({
        code: 'DOWNGRADE_NOT_ALLOWED',
        message: 'Plan downgrade is disabled by policy.',
      });
    }

    try {
      const changed = await this.platformRepo.changePlanImmediate({
        companyId: dto.companyId,
        newPlanId: dto.newPlanId,
        actorUserId,
        reason: dto.reason,
      });

      if (!changed) {
        throw new NotFoundException({
          code: 'LIVE_SUBSCRIPTION_NOT_FOUND',
          message: 'No live subscription found for this company.',
        });
      }

      return changed;
    } catch (error) {
      const knownError = error as Prisma.PrismaClientKnownRequestError;
      if (knownError.code === 'P2002') {
        throw new ConflictException({
          code: 'LIVE_SUBSCRIPTION_CONFLICT',
          message:
            'Subscription lifecycle conflict detected. Please retry the request.',
        });
      }
      throw error;
    }
  }
}


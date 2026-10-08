/**
 * ============================================================================
 * PUBLIC TENANT SUBSCRIPTION GUARD
 * ============================================================================
 *
 * Guard for public-facing endpoints that use companyId from route params.
 * Validates company subscription for unauthenticated access.
 *
 * Use case: public invoice pages, public company info, etc.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SubscriptionGovernanceService } from '../../database/services/subscription-governance.service';
import { SubscriptionStatus } from '@prisma/client';

const GRACE_PERIOD_DAYS = 7;

@Injectable()
export class PublicTenantSubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(PublicTenantSubscriptionGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGovernance: SubscriptionGovernanceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const companyId = request.params.companyId;

    if (!companyId) return true;

    // 1. Fetch company
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!company) {
      throw new NotFoundException('المنشأة غير موجودة');
    }

    if (!company.isActive) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'CompanyDisabled',
        message: 'عذراً، هذه المنشأة غير متاحة حالياً.',
      });
    }

    // 2. Attach company to request
    request.company = company;

    // 3. Fetch latest subscription
    const subscription =
      await this.subscriptionGovernance.findSubscriptionForAccess(companyId);

    if (!subscription) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'NoSubscription',
        message: 'عذراً، هذه المنشأة غير متاحة حالياً.',
      });
    }

    const now = new Date();
    const { status } = subscription;

    // ACTIVE — check if actually expired past grace
    if (status === SubscriptionStatus.ACTIVE) {
      const endDate = new Date(subscription.endDate);
      const daysExpired = Math.ceil(
        (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysExpired > GRACE_PERIOD_DAYS) {
        this.blockAccess(
          companyId,
          `subscription expired ${daysExpired} days ago`,
        );
      }
      return true;
    }

    // TRIAL — check if expired past grace
    if (status === SubscriptionStatus.TRIAL) {
      const endDate = new Date(subscription.endDate);
      const daysExpired = Math.ceil(
        (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysExpired > GRACE_PERIOD_DAYS) {
        this.blockAccess(companyId, `trial expired ${daysExpired} days ago`);
      }
      return true;
    }

    // SUSPENDED or DISABLED — block
    if (
      status === SubscriptionStatus.SUSPENDED ||
      status === SubscriptionStatus.DISABLED
    ) {
      this.blockAccess(companyId, `status is ${status.toLowerCase()}`);
    }

    // EXPIRED — block
    if (status === SubscriptionStatus.EXPIRED) {
      this.blockAccess(companyId, 'subscription expired');
    }

    return true;
  }

  private blockAccess(companyId: string, reason: string): never {
    this.logger.warn(`Public access blocked: Company ${companyId} — ${reason}`);
    throw new ForbiddenException({
      statusCode: 403,
      error: 'SubscriptionExpired',
      message:
        'عذراً، هذه المنشأة غير متاحة حالياً. يرجى التواصل مع المنشأة مباشرة.',
    });
  }
}

/**
 * ============================================================================
 * TENANT SUBSCRIPTION GUARD - SaaS Enforcement Layer
 * ============================================================================
 *
 * Core SaaS business model enforcement for Daftar (دفتر).
 * Ensures:
 *   1. Expired trial companies cannot perform write operations
 *   2. Suspended/Disabled companies are blocked from all write operations
 *   3. Platform admins (SUPER_ADMIN) bypass all restrictions
 *   4. Grace period is handled with appropriate warnings
 *
 * Schema: Company + CompanySubscription (separate tables)
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SubscriptionGovernanceService } from '../../database/services/subscription-governance.service';
import { SubscriptionStatus, UserRole } from '@prisma/client';

// ============================================================================
// CONSTANTS
// ============================================================================

export const SKIP_SUBSCRIPTION_CHECK_KEY = 'skipSubscriptionCheck';
export const READ_ONLY_ENDPOINT_KEY = 'readOnlyEndpoint';

/** Grace period in days after subscription expiry */
const GRACE_PERIOD_DAYS = 7;

/** Roles that bypass subscription checks */
const PLATFORM_ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN];

// ============================================================================
// DECORATORS
// ============================================================================

/** Skip subscription check for essential endpoints (e.g., subscription status) */
export const SkipSubscriptionCheck = () =>
  SetMetadata(SKIP_SUBSCRIPTION_CHECK_KEY, true);

/** Mark endpoint as read-only — suspended companies can still view data */
export const ReadOnlyEndpoint = () => SetMetadata(READ_ONLY_ENDPOINT_KEY, true);

// ============================================================================
// INTERFACES
// ============================================================================

interface SubscriptionCheckResult {
  allowed: boolean;
  status: SubscriptionStatus;
  message?: string;
  daysRemaining?: number;
  isGracePeriod?: boolean;
}

interface ActiveSubscriptionData {
  id: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  plan: { name: string };
}

// ============================================================================
// GUARD
// ============================================================================

@Injectable()
export class TenantSubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(TenantSubscriptionGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly subscriptionGovernance: SubscriptionGovernanceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const companyId: string | undefined = user?.companyId;

    // 1. Skip if decorator says so
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (shouldSkip) return true;

    // 2. Platform admins bypass
    if (user && this.isPlatformAdmin(user.role as UserRole)) {
      this.logger.debug(
        `Platform admin ${String(user.email)} bypassing subscription check`,
      );
      return true;
    }

    // 3. No company context = public route
    if (!companyId) return true;

    // 4. Check company exists & active
    const company = await this.getCompany(companyId);
    if (!company) {
      throw new ForbiddenException('المنشأة غير موجودة في النظام');
    }
    if (!company.isActive) {
      throw new ForbiddenException(
        'تم تعطيل المنشأة. يرجى التواصل مع إدارة المنصة.',
      );
    }

    // 5. Fetch latest subscription
    const subscription = await this.getActiveSubscription(companyId);
    if (!subscription) {
      throw new ForbiddenException(
        'لا يوجد اشتراك نشط. يرجى التواصل مع إدارة المنصة لتفعيل الاشتراك.',
      );
    }

    // 6. Validate subscription status
    const checkResult = this.validateSubscription(subscription);

    const isReadOnly = this.reflector.getAllAndOverride<boolean>(
      READ_ONLY_ENDPOINT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!checkResult.allowed) {
      if (isReadOnly && checkResult.status === SubscriptionStatus.SUSPENDED) {
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-Subscription-Warning', checkResult.message);
        response.setHeader('X-Subscription-Status', checkResult.status);
        return true;
      }

      this.logger.warn(
        `Access blocked for company ${companyId}: ${checkResult.message}`,
      );

      throw new ForbiddenException({
        statusCode: 403,
        error: 'SubscriptionError',
        message: checkResult.message,
        subscriptionStatus: checkResult.status,
        daysRemaining: checkResult.daysRemaining,
        isGracePeriod: checkResult.isGracePeriod,
      });
    }

    // 7. Attach subscription info to request
    request.subscriptionStatus = checkResult.status;
    request.subscriptionDaysRemaining = checkResult.daysRemaining;
    request.isGracePeriod = checkResult.isGracePeriod;

    if (checkResult.isGracePeriod) {
      const response = context.switchToHttp().getResponse();
      response.setHeader(
        'X-Subscription-Warning',
        `اشتراكك انتهى. متبقي ${checkResult.daysRemaining} يوم في فترة السماح.`,
      );
    }

    return true;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private isPlatformAdmin(role: UserRole | undefined): boolean {
    if (!role) return false;
    return PLATFORM_ADMIN_ROLES.includes(role);
  }

  private async getCompany(
    companyId: string,
  ): Promise<{ id: string; isActive: boolean } | null> {
    try {
      return await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, isActive: true },
      });
    } catch (error) {
      this.logger.error(`Error fetching company: ${error.message}`);
      return null;
    }
  }

  private async getActiveSubscription(
    companyId: string,
  ): Promise<ActiveSubscriptionData | null> {
    try {
      return await this.subscriptionGovernance.findSubscriptionForAccess(
        companyId,
      );
    } catch (error) {
      this.logger.error(`Error fetching subscription: ${error.message}`);
      return null;
    }
  }

  /**
   * Subscription State Machine:
   *
   *   ┌─────────┐   expires   ┌──────────────┐   7 days   ┌───────────┐
   *   │  TRIAL  │ ──────────> │ GRACE PERIOD │ ─────────> │  EXPIRED  │
   *   └─────────┘             └──────────────┘            └───────────┘
   *        │                         │                          │
   *        │ subscribes              │ pays                     │ admin
   *        ▼                         ▼                          ▼
   *   ┌─────────┐             ┌─────────┐                ┌──────────┐
   *   │ ACTIVE  │ <────────── │ ACTIVE  │                │ DISABLED │
   *   └─────────┘   renews    └─────────┘                └──────────┘
   */
  private validateSubscription(
    sub: ActiveSubscriptionData,
  ): SubscriptionCheckResult {
    const now = new Date();
    const status = sub.status;

    // ACTIVE
    if (status === SubscriptionStatus.ACTIVE) {
      const daysRemaining = this.daysRemaining(now, new Date(sub.endDate));

      if (daysRemaining < 0) {
        const graceDays = GRACE_PERIOD_DAYS + daysRemaining;
        if (graceDays > 0) {
          return {
            allowed: true,
            status,
            message: `اشتراكك انتهى. متبقي ${graceDays} يوم في فترة السماح.`,
            daysRemaining: graceDays,
            isGracePeriod: true,
          };
        }
        return {
          allowed: false,
          status: SubscriptionStatus.EXPIRED,
          message:
            'انتهت فترة السماح. يرجى تجديد الاشتراك للاستمرار في استخدام النظام.',
          daysRemaining: 0,
          isGracePeriod: false,
        };
      }

      return { allowed: true, status, daysRemaining };
    }

    // TRIAL
    if (status === SubscriptionStatus.TRIAL) {
      const daysRemaining = this.daysRemaining(now, new Date(sub.endDate));

      if (daysRemaining < 0) {
        const graceDays = GRACE_PERIOD_DAYS + daysRemaining;
        if (graceDays > 0) {
          return {
            allowed: true,
            status,
            message: `انتهت الفترة التجريبية. متبقي ${graceDays} يوم لترقية اشتراكك.`,
            daysRemaining: graceDays,
            isGracePeriod: true,
          };
        }
        return {
          allowed: false,
          status,
          message:
            'انتهت الفترة التجريبية وفترة السماح. يرجى الاشتراك للاستمرار.',
          daysRemaining: 0,
          isGracePeriod: false,
        };
      }

      return {
        allowed: true,
        status,
        daysRemaining,
        message:
          daysRemaining <= 3
            ? `متبقي ${daysRemaining} يوم في الفترة التجريبية`
            : undefined,
      };
    }

    // EXPIRED
    if (status === SubscriptionStatus.EXPIRED) {
      return {
        allowed: false,
        status,
        message:
          'انتهى اشتراكك. يرجى تجديد الاشتراك للاستمرار في استخدام النظام.',
      };
    }

    // SUSPENDED
    if (status === SubscriptionStatus.SUSPENDED) {
      return {
        allowed: false,
        status,
        message:
          'تم إيقاف اشتراكك مؤقتاً. يرجى تجديد الاشتراك للاستمرار في استخدام النظام.',
      };
    }

    // DISABLED
    if (status === SubscriptionStatus.DISABLED) {
      return {
        allowed: false,
        status,
        message:
          'تم تعطيل اشتراكك. يرجى التواصل مع إدارة المنصة لإعادة التفعيل.',
      };
    }

    // UNKNOWN
    this.logger.error(`Unknown subscription status: ${String(status)}`);
    return {
      allowed: false,
      status,
      message: 'حالة الاشتراك غير معروفة. يرجى التواصل مع الدعم.',
    };
  }

  private daysRemaining(from: Date, to: Date): number {
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// ============================================================================
// EXPRESS REQUEST AUGMENTATION
// ============================================================================

declare module 'express-serve-static-core' {
  interface Request {
    subscriptionStatus?: SubscriptionStatus;
    subscriptionDaysRemaining?: number;
    isGracePeriod?: boolean;
  }
}

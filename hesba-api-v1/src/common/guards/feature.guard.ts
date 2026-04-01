/**
 * ============================================================================
 * FEATURE GUARD — Plan Feature Enforcement (Layer 2 of 3)
 * ============================================================================
 *
 * POSITION IN GUARD CHAIN:
 *   JwtAuthGuard → RolesGuard → TenantSubscriptionGuard → [FeatureGuard] → PermissionsGuard
 *
 * WHY HERE:
 *   - After JWT:  we need request.user to identify the company.
 *   - After TenantSubscriptionGuard: subscription must be valid before checking features.
 *   - Before PermissionsGuard: no point checking user permissions if the plan
 *     doesn't even include the feature.
 *
 * ACTIVATION:
 *   Only activates when @RequireFeature(FeatureKey.X) is on the route or controller.
 *   Routes without the decorator pass through transparently — no performance cost.
 *
 * BYPASS:
 *   SUPER_ADMIN bypasses all feature checks (same pattern as subscription guard).
 *   OWNER is NOT bypassed — the plan limits apply to the whole company.
 *
 * DESIGN NOTE:
 *   Feature checks are intentionally FAIL-CLOSED:
 *     - Unknown feature key → denied
 *     - No subscription found → denied
 *     - Redis down → EntitlementService falls back to DB → still enforced
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector }  from '@nestjs/core';
import { UserRole }   from '@prisma/client';
import { EntitlementService }   from '../entitlements/entitlement.service';
import { EntitlementException } from '../entitlements/entitlement-errors';
import { EntitlementErrorCode } from '../entitlements/entitlement-errors';
import { REQUIRE_FEATURE_KEY }  from '../decorators/require-feature.decorator';
import { FeatureKey }           from '../entitlements/feature-catalog';

@Injectable()
export class FeatureGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGuard.name);

  constructor(
    private readonly reflector:           Reflector,
    private readonly entitlementService:  EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ── 1. Read decorator metadata ────────────────────────────────────────────
    const requiredFeature = this.reflector.getAllAndOverride<FeatureKey | undefined>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequireFeature on this route — pass through immediately
    if (!requiredFeature) return true;

    const request   = context.switchToHttp().getRequest();
    const user      = request.user;
    const companyId = user?.companyId as string | undefined;

    // ── 2. Platform admin bypass ──────────────────────────────────────────────
    // SUPER_ADMIN manages the platform and bypasses all tenant restrictions.
    if (user?.role === UserRole.SUPER_ADMIN) {
      this.logger.debug(
        `SUPER_ADMIN bypass for feature "${requiredFeature}"`,
      );
      return true;
    }

    // ── 3. No company context — public route, no tenant restrictions ──────────
    if (!companyId) return true;

    // ── 4. Enforce the feature gate ───────────────────────────────────────────
    const hasFeature = await this.entitlementService.hasFeature(
      companyId,
      requiredFeature,
    );

    if (!hasFeature) {
      this.logger.warn(
        `[FEATURE BLOCKED] feature="${requiredFeature}" ` +
        `company=${companyId} user=${user?.id ?? 'unknown'}`,
      );
      throw new EntitlementException({
        code:       EntitlementErrorCode.FEATURE_NOT_AVAILABLE,
        featureKey: requiredFeature,
      });
    }

    return true;
  }
}

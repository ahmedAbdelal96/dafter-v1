/**
 * ============================================================================
 * GUARDS MODULE
 * ============================================================================
 *
 * Guard execution order (as applied in subscription.decorator.ts):
 *   JwtAuthGuard → RolesGuard → TenantSubscriptionGuard → FeatureGuard → PermissionsGuard
 *
 * Guards included:
 *   - RolesGuard:                    UserRole access control (OWNER / STAFF / SUPER_ADMIN)
 *   - PermissionsGuard:              Fine-grained permission flags within a role
 *   - TenantSubscriptionGuard:       Layer 1 — subscription status (ACTIVE / TRIAL / grace)
 *   - FeatureGuard:                  Layer 2 — plan feature inclusion (@RequireFeature)
 *   - PublicTenantSubscriptionGuard: Unauthenticated public route subscription check
 */

import { Module, Global } from '@nestjs/common';
import { RolesGuard }                    from './roles.guard';
import { PermissionsGuard }              from './permissions.guard';
import { TenantSubscriptionGuard }       from './tenant-subscription.guard';
import { PublicTenantSubscriptionGuard } from './public-tenant-subscription.guard';
import { FeatureGuard }                  from './feature.guard';

@Global()
@Module({
  providers: [
    RolesGuard,
    PermissionsGuard,
    TenantSubscriptionGuard,
    PublicTenantSubscriptionGuard,
    FeatureGuard,
  ],
  exports: [
    RolesGuard,
    PermissionsGuard,
    TenantSubscriptionGuard,
    PublicTenantSubscriptionGuard,
    FeatureGuard,
  ],
})
export class GuardsModule {}

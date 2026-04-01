/**
 * ============================================================================
 * SUBSCRIPTION-AWARE DECORATORS
 * ============================================================================
 *
 * Combined decorators for common guard patterns (reduces boilerplate).
 *
 * GUARD ORDER (Bottom → Top execution in NestJS):
 *   JwtAuthGuard → RolesGuard → TenantSubscriptionGuard → FeatureGuard → PermissionsGuard
 *
 * ⚠️  DECORATOR ORDER WARNING:
 * TypeScript method decorators are applied BOTTOM → TOP, and NestJS appends
 * guards via extendArrayMetadata. This means the LAST declared decorator
 * has its guards executed FIRST.
 *
 * ✅ CORRECT — @UseGuards(PermissionsGuard) declared ABOVE @ProtectedWrite:
 *   @UseGuards(PermissionsGuard)        ← applied last  → appended after others
 *   @ProtectedWrite()                   ← applied first → [JWT, Roles, Tenant, Feature]
 *   @RequirePermissions('manageX')
 *   → execution order: JWT → Roles → Tenant → Feature → Permissions  ✓
 */

import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth }              from '@nestjs/swagger';
import { JwtAuthGuard }               from '../guards/jwt-auth.guard';
import { RolesGuard }                 from '../guards/roles.guard';
import { FeatureGuard }               from '../guards/feature.guard';
import {
  TenantSubscriptionGuard,
  ReadOnlyEndpoint,
  SkipSubscriptionCheck,
} from '../guards/tenant-subscription.guard';
import { Roles }     from './roles.decorator';
import { UserRole }  from '@prisma/client';
import { FeatureKey } from '../entitlements/feature-catalog';
import { RequireFeature } from './require-feature.decorator';

// ── Base Combinators ──────────────────────────────────────────────────────────

/**
 * Protected WRITE endpoint — requires active subscription.
 * Chain order: JWT → Roles → TenantSubscription → Feature (if @RequireFeature present)
 *
 * @example
 * @ProtectedWrite(UserRole.OWNER, UserRole.STAFF)
 * @Post()
 * async createCustomer() { ... }
 */
export function ProtectedWrite(...roles: UserRole[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard, TenantSubscriptionGuard, FeatureGuard),
    Roles(...roles),
    ApiBearerAuth(),
  );
}

/**
 * Protected READ endpoint — suspended companies can still read.
 * Chain order: JWT → Roles → TenantSubscription (read-only mode) → Feature
 *
 * @example
 * @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
 * @Get()
 * async listCustomers() { ... }
 */
export function ProtectedRead(...roles: UserRole[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard, TenantSubscriptionGuard, FeatureGuard),
    Roles(...roles),
    ReadOnlyEndpoint(),
    ApiBearerAuth(),
  );
}

/**
 * Protected endpoint with explicit feature requirement.
 * Combines @ProtectedWrite + @RequireFeature in one decorator.
 *
 * @example
 * @ProtectedFeature(FeatureKey.INSTALLMENTS_MANAGE, UserRole.OWNER, UserRole.STAFF)
 * @Post()
 * async createContract() { ... }
 */
export function ProtectedFeature(featureKey: FeatureKey, ...roles: UserRole[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard, TenantSubscriptionGuard, FeatureGuard),
    Roles(...roles),
    RequireFeature(featureKey),
    ApiBearerAuth(),
  );
}

/**
 * Protected READ endpoint with explicit feature requirement.
 *
 * @example
 * @ProtectedFeatureRead(FeatureKey.REPORTS_READ, UserRole.OWNER, UserRole.STAFF)
 * @Get()
 * async getSummary() { ... }
 */
export function ProtectedFeatureRead(featureKey: FeatureKey, ...roles: UserRole[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard, TenantSubscriptionGuard, FeatureGuard),
    Roles(...roles),
    RequireFeature(featureKey),
    ReadOnlyEndpoint(),
    ApiBearerAuth(),
  );
}

// ── Shorthand Combinators ─────────────────────────────────────────────────────

/** Owner-only WRITE endpoint */
export function OwnerOnly() {
  return ProtectedWrite(UserRole.OWNER, UserRole.SUPER_ADMIN);
}

/** Owner + Staff WRITE endpoint */
export function StaffWrite() {
  return ProtectedWrite(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN);
}

/**
 * Skip subscription + feature checks — use VERY sparingly.
 * Only for: subscription status, payment, renewal, profile endpoints.
 */
export function NoSubscriptionCheck(...roles: UserRole[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
    SkipSubscriptionCheck(),
    ApiBearerAuth(),
  );
}

// Re-export for convenience
export { SkipSubscriptionCheck, ReadOnlyEndpoint };

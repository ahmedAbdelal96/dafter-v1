/**
 * @RequireFeature — Route-level plan feature enforcement.
 *
 * Marks a controller method (or class) as requiring the given plan feature.
 * Enforced at runtime by FeatureGuard.
 *
 * USAGE:
 *   Apply ABOVE the combined guard decorator so decorators are processed
 *   in the correct order (TypeScript applies bottom→top).
 *
 * @example — Single endpoint
 *   @RequireFeature(FeatureKey.INSTALLMENTS_READ)
 *   @ProtectedRead(UserRole.OWNER, UserRole.STAFF)
 *   @Get()
 *   async listContracts() { ... }
 *
 * @example — Whole controller
 *   @RequireFeature(FeatureKey.INSTALLMENTS_READ)
 *   @Controller('installments')
 *   export class InstallmentsController { ... }
 *
 * NOTE: SUPER_ADMIN always bypasses feature checks (see FeatureGuard).
 */

import { SetMetadata } from '@nestjs/common';
import { FeatureKey }  from '../entitlements/feature-catalog';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

export const RequireFeature = (featureKey: FeatureKey) =>
  SetMetadata(REQUIRE_FEATURE_KEY, featureKey);

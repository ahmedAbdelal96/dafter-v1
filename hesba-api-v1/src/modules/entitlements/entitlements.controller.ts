/**
 * ============================================================================
 * ENTITLEMENTS CONTROLLER
 * ============================================================================
 *
 * Provides the frontend with visibility into:
 *   1. GET /my/entitlements â€” current company's feature access + quota usage
 *   2. GET /plans/feature-catalog â€” static feature key catalog (for admins/UI)
 *
 * WHY EXPOSE THIS TO THE FRONTEND:
 * The frontend uses this to:
 *   - Show/hide navigation items (UX only â€” not security)
 *   - Display quota progress bars ("You have 87/100 customers")
 *   - Trigger upgrade prompts at the right time
 *   - Avoid making blocked API calls in the first place
 *
 * SECURITY NOTE:
 * The frontend rendering decisions are UX improvements ONLY.
 * All security enforcement still happens in the backend guards and use cases.
 * Never trust frontend-side feature hiding as a security measure.
 */

import {
  Controller,
  Get,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { EntitlementService }  from '../../common/entitlements/entitlement.service';
import { ALL_FEATURE_KEYS, FEATURE_CATALOG_VERSION } from '../../common/entitlements/feature-catalog';
import { ProtectedRead, NoSubscriptionCheck } from '../../common/decorators/subscription.decorator';
import { CurrentUser }         from '../../common/decorators/current-user.decorator';
import { ApiResponseDto }      from '../../common/dto/api-response.dto';
import { TranslationService }  from '../../common/services/translation.service';
import type { AuthenticatedUser } from '../../common/types';

@ApiTags('Entitlements')
@ApiBearerAuth()
@Controller()
export class EntitlementsController {
  constructor(
    private readonly entitlementService: EntitlementService,
    private readonly t: TranslationService,
  ) {}

  /**
   * GET /my/entitlements
   *
   * Returns the calling company's effective entitlements:
   *   - Which features are active in their plan
   *   - Current quota usage vs. plan limits for every entity type
   *   - Subscription status and expiry date
   *
   * Used by the mobile/web app on startup to drive UI state.
   * Responds immediately from Redis cache (5-min TTL).
   */
  @Get('my/entitlements')
  @ProtectedRead(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current company entitlements',
    description:
      'Returns feature access and quota usage for the authenticated company. ' +
      'Use this to drive UI visibility and show quota progress in the app.',
  })
  @ApiResponse({ status: 200, description: 'Entitlements returned successfully' })
  @ApiResponse({ status: 403, description: 'No active subscription' })
  async getMyEntitlements(@CurrentUser() user: AuthenticatedUser) {
    // SUPER_ADMIN has no companyId â€” not applicable for tenant entitlements
    if (!user.companyId) {
      throw new NotFoundException(
        this.t.translate('entitlements.noActiveSubscription'),
      );
    }

    const entitlements = await this.entitlementService.getEffectiveEntitlements(
      user.companyId,
    );

    if (!entitlements) {
      throw new NotFoundException(
        this.t.translate('entitlements.noActiveSubscription'),
      );
    }

    return new ApiResponseDto(
      entitlements,
      this.t.translate('entitlements.success'),
    );
  }

  /**
   * GET /plans/feature-catalog
   *
   * Returns the static catalog of all valid feature keys with the current version.
   * Used by the Super Admin dashboard to populate plan feature selectors
   * and validate feature arrays when creating/editing plans.
   *
   * No subscription check needed â€” it's just a static list.
   */
  @Get('plans/feature-catalog')
  @NoSubscriptionCheck(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get feature catalog (Super Admin)',
    description:
      'Returns all valid feature keys and catalog version. ' +
      'Use this to populate feature selectors when creating or editing plans.',
  })
  @ApiResponse({ status: 200, description: 'Feature catalog returned' })
  async getFeatureCatalog() {
    return new ApiResponseDto(
      {
        version:  FEATURE_CATALOG_VERSION,
        features: ALL_FEATURE_KEYS,
      },
      this.t.translate('entitlements.catalogSuccess'),
    );
  }
}


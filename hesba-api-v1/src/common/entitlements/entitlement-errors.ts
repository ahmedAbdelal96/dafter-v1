/**
 * ============================================================================
 * ENTITLEMENT ERROR CONTRACT
 * ============================================================================
 *
 * WHY A UNIFIED CONTRACT:
 * Before this, every module threw a plain ForbiddenException with a translated
 * string. The frontend had no machine-readable way to distinguish "subscription
 * expired" from "plan limit reached" from "feature not in plan" — they all
 * looked identical as 403s with different Arabic text.
 *
 * NOW:
 * Every entitlement violation throws EntitlementException, which always
 * includes a structured payload the frontend can reliably parse:
 *
 *   {
 *     statusCode: 403,
 *     error: "EntitlementError",       ← fixed discriminator
 *     code: "PLAN_LIMIT_REACHED",      ← machine-readable code
 *     entity: "customers",            ← which entity type
 *     limit: 100,                     ← plan limit
 *     current: 100,                   ← company's current count
 *     featureKey: "module.x.manage",  ← which feature (for FEATURE_NOT_AVAILABLE)
 *     message: "..."                  ← human-readable, Arabic default
 *   }
 *
 * FRONTEND USAGE:
 *   if (err.response.code === 'PLAN_LIMIT_REACHED') {
 *     showUpgradeModal({ entity: err.response.entity, limit: err.response.limit });
 *   }
 */

import { ForbiddenException } from '@nestjs/common';

// ── Error Codes ───────────────────────────────────────────────────────────────

export enum EntitlementErrorCode {
  /**
   * The requested feature/module is not included in the company's current plan.
   * Frontend action: show upgrade prompt specific to the feature.
   */
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',

  /**
   * The company has reached the numeric quota defined in their plan
   * (e.g., maxCustomers = 100 and they already have 100 customers).
   * Frontend action: show quota usage + upgrade prompt.
   */
  PLAN_LIMIT_REACHED = 'PLAN_LIMIT_REACHED',

  /**
   * No active/trial subscription found.
   * Normally TenantSubscriptionGuard blocks before reaching here,
   * but kept for defensive coverage in service-layer calls.
   * Frontend action: redirect to subscription renewal.
   */
  SUBSCRIPTION_INACTIVE = 'SUBSCRIPTION_INACTIVE',
}

// ── Quota Entity Types ────────────────────────────────────────────────────────

/**
 * The entity types that have numeric plan quotas.
 * Used in EntitlementErrorPayload.entity so the frontend knows
 * which counter to display.
 */
export type QuotaType =
  | 'users'
  | 'customers'
  | 'suppliers'
  | 'employees'
  | 'ledgerEntries';

// ── Payload Interface ─────────────────────────────────────────────────────────

export interface EntitlementErrorPayload {
  /** Machine-readable error category */
  code: EntitlementErrorCode;

  /** Which feature key was blocked (relevant for FEATURE_NOT_AVAILABLE) */
  featureKey?: string;

  /** Which entity type hit the quota (relevant for PLAN_LIMIT_REACHED) */
  entity?: QuotaType;

  /**
   * Plan limit value.
   * - number:  normal numeric limit
   * - string:  BigInt limit (ledgerEntries) serialized as string
   * - null:    unlimited (shouldn't appear on error, but kept for type safety)
   */
  limit?: number | string | null;

  /** Current count at the time of the check */
  current?: number;

  /** Optional override for the human-readable message (falls back to Arabic default) */
  message?: string;
}

// ── Exception Class ───────────────────────────────────────────────────────────

/**
 * Throws a structured 403 that the frontend can parse reliably.
 *
 * Design: extends NestJS ForbiddenException so it integrates with
 * the existing HttpExceptionFilter without any extra plumbing.
 *
 * @example — Feature gate
 * throw new EntitlementException({
 *   code: EntitlementErrorCode.FEATURE_NOT_AVAILABLE,
 *   featureKey: 'module.installments.manage',
 * });
 *
 * @example — Quota exceeded
 * throw new EntitlementException({
 *   code: EntitlementErrorCode.PLAN_LIMIT_REACHED,
 *   entity: 'customers',
 *   limit: 100,
 *   current: 100,
 * });
 */
export class EntitlementException extends ForbiddenException {
  constructor(payload: EntitlementErrorPayload) {
    super({
      statusCode: 403,
      error: 'EntitlementError',
      code: payload.code,
      // Only include fields that have values — keep payload lean
      ...(payload.featureKey !== undefined && { featureKey: payload.featureKey }),
      ...(payload.entity      !== undefined && { entity: payload.entity }),
      ...(payload.limit       !== undefined && { limit: payload.limit }),
      ...(payload.current     !== undefined && { current: payload.current }),
      message: payload.message ?? EntitlementException.buildDefaultMessage(payload),
    });
  }

  /**
   * Builds an informative Arabic default message.
   * The frontend should use `code` + `entity`/`featureKey` for its own
   * localised UI copy — this message is the API-level fallback.
   */
  private static buildDefaultMessage(payload: EntitlementErrorPayload): string {
    switch (payload.code) {
      case EntitlementErrorCode.FEATURE_NOT_AVAILABLE:
        return payload.featureKey
          ? `الميزة "${payload.featureKey}" غير متاحة في خطتك الحالية. يرجى الترقية للوصول إليها.`
          : 'هذه الميزة غير متاحة في خطتك الحالية. يرجى الترقية للوصول إليها.';

      case EntitlementErrorCode.PLAN_LIMIT_REACHED:
        return `وصلت إلى الحد الأقصى المسموح به في خطتك` +
          (payload.entity ? ` لـ "${payload.entity}"` : '') +
          (payload.limit  != null ? ` (${payload.limit})` : '') +
          `. يرجى الترقية لإضافة المزيد.`;

      case EntitlementErrorCode.SUBSCRIPTION_INACTIVE:
        return 'اشتراكك غير نشط. يرجى تجديد الاشتراك للمتابعة.';
    }
  }
}

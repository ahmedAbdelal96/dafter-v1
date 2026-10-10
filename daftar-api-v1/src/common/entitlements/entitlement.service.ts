/**
 * ============================================================================
 * ENTITLEMENT SERVICE — Core SaaS Access Control Engine
 * ============================================================================
 *
 * This service is the single enforcement point for BOTH:
 *   1. Feature gates  — "does this company's plan include this feature?"
 *   2. Quota gates    — "has this company hit its plan limit for entity X?"
 *
 * It is consumed by:
 *   - FeatureGuard (automatic route-level feature enforcement via @RequireFeature)
 *   - Use Cases (assertQuota before create operations)
 *   - EntitlementsController (exposes /my/entitlements for the frontend)
 *
 * ── CACHING STRATEGY ──────────────────────────────────────────────────────────
 *
 * We cache the subscription + plan data per companyId (not the live counts).
 * Counts are always read fresh from DB to avoid stale quota decisions.
 * Plan data changes rarely (only on plan/subscription mutations) so a 5-minute
 * cache is safe. Cache is invalidated immediately after any plan/subscription
 * mutation via invalidate().
 *
 * ── RACE CONDITION HANDLING ───────────────────────────────────────────────────
 *
 * assertQuota accepts an optional Prisma transaction client. When the caller
 * passes `tx`, the count query runs inside the same transaction as the create
 * operation. This prevents "check-then-act" races where two concurrent requests
 * both see count=99 and both succeed past a limit of 100.
 *
 * For stronger guarantees on high-traffic systems, upgrade the
 * CompanySubscription lock strategy to SELECT FOR UPDATE on the subscription row.
 * The SubscriptionGovernanceService.lockCompanyForSubscriptionMutation() helper
 * already provides this.
 *
 * ── GUARD ORDER ───────────────────────────────────────────────────────────────
 *
 * JWT → RolesGuard → TenantSubscriptionGuard → FeatureGuard → PermissionsGuard
 *
 * EntitlementService is called by FeatureGuard (feature checks) and by Use Cases
 * (quota checks). Subscription validity is guaranteed upstream by
 * TenantSubscriptionGuard before we reach here.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SubscriptionGovernanceService } from '../../database/services/subscription-governance.service';
import { FeatureKey, isValidFeatureKey } from './feature-catalog';
import {
  EntitlementErrorCode,
  EntitlementException,
  QuotaType,
} from './entitlement-errors';

// ── Internal Cache Shape ──────────────────────────────────────────────────────

/**
 * What we store in Redis per company.
 * Kept intentionally lean — no counts, only the plan limits & features.
 */
interface CachedPlanData {
  subscriptionId:   string;
  subscriptionStatus: string;
  endDate:          string;       // ISO string (JSON-safe)
  planId:           string;
  planName:         string;
  features:         string[];     // raw strings from DB
  maxUsers:         number | null;
  maxCustomers:     number | null;
  maxSuppliers:     number | null;
  maxEmployees:     number | null;
  maxLedgerEntries: string | null; // BigInt → string for JSON safety
}

// ── Public Return Types ───────────────────────────────────────────────────────

export interface QuotaStatus {
  /** Plan cap (null = unlimited) */
  limit: number | string | null;
  /** Company's current count */
  current: number;
  isUnlimited: boolean;
  isAtLimit: boolean;
  /** Percentage used (0-100+), null if unlimited */
  usagePercent: number | null;
}

export interface EffectiveEntitlements {
  planName:           string;
  subscriptionStatus: string;
  endDate:            string;
  features:           string[];
  quotas: Record<QuotaType, QuotaStatus>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_NAMESPACE   = 'entitlements';
const CACHE_TTL_SECONDS = 300; // 5 minutes — safe because we invalidate on mutation

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    private readonly prisma:     PrismaService,
    private readonly cache:      CacheService,
    private readonly governance: SubscriptionGovernanceService,
  ) {}

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Check if the company's plan includes a specific feature key.
   *
   * Returns false (not throws) so callers can branch on the result
   * without try/catch. Use assertFeature() for the throwing version.
   *
   * @param companyId  - The tenant
   * @param featureKey - Must be a valid FeatureKey enum value
   */
  async hasFeature(
    companyId:  string,
    featureKey: FeatureKey,
  ): Promise<boolean> {
    // Fail-closed on unknown keys — prevents typos from bypassing gates
    if (!isValidFeatureKey(featureKey)) {
      this.logger.error(
        `Unknown feature key requested: "${featureKey}" for company ${companyId}`,
      );
      return false;
    }

    const plan = await this.loadPlanData(companyId);
    if (!plan) {
      // No entitled subscription — guard should have caught this upstream.
      // Return false conservatively so FeatureGuard blocks the request.
      return false;
    }

    return plan.features.includes(featureKey);
  }

  /**
   * Assert that the company's plan includes a feature.
   * Throws EntitlementException (403) if not.
   *
   * Use inside Use Cases for programmatic feature checks.
   * For route-level enforcement, prefer @RequireFeature decorator + FeatureGuard.
   */
  async assertFeature(
    companyId:  string,
    featureKey: FeatureKey,
  ): Promise<void> {
    const has = await this.hasFeature(companyId, featureKey);
    if (!has) {
      this.logger.warn(
        `[ENTITLEMENT DENIED] feature="${featureKey}" company=${companyId}`,
      );
      throw new EntitlementException({
        code: EntitlementErrorCode.FEATURE_NOT_AVAILABLE,
        featureKey,
      });
    }
  }

  /**
   * Assert that the company is within its plan quota for a given entity type.
   * Throws EntitlementException (403) if at or over the limit.
   *
   * IMPORTANT — pass the transaction client when calling from inside a
   * Prisma $transaction block. This makes the count query part of the same
   * atomic unit as the insert, preventing race-condition over-quota writes.
   *
   * @example — inside a use case
   * await this.prisma.$transaction(async (tx) => {
   *   await this.entitlementService.assertQuota(companyId, 'customers', tx);
   *   await tx.customer.create({ ... });
   * });
   */
  async assertQuota(
    companyId: string,
    quotaType: QuotaType,
    tx?:       Prisma.TransactionClient,
  ): Promise<void> {
    const plan = await this.loadPlanData(companyId);

    // No entitled subscription — TenantSubscriptionGuard should block first.
    // We don't double-gate here; quota checks are secondary to subscription status.
    if (!plan) return;

    const { limit, current } = await this.resolveQuotaCounts(
      companyId,
      quotaType,
      plan,
      tx,
    );

    // null = unlimited — nothing to enforce
    if (limit === null) return;

    if (current >= limit) {
      this.logger.warn(
        `[QUOTA DENIED] type=${quotaType} current=${current} limit=${limit} company=${companyId}`,
      );
      throw new EntitlementException({
        code:    EntitlementErrorCode.PLAN_LIMIT_REACHED,
        entity:  quotaType,
        limit,
        current,
      });
    }
  }

  /**
   * Returns the complete entitlement snapshot for a company.
   *
   * Called by GET /my/entitlements so the frontend can:
   *   - Show quota usage bars
   *   - Hide/show module navigation items
   *   - Display "upgrade" prompts at the right moment
   *
   * Counts are always fresh (no caching) — only plan data is cached.
   */
  async getEffectiveEntitlements(
    companyId: string,
  ): Promise<EffectiveEntitlements | null> {
    const plan = await this.loadPlanData(companyId);
    if (!plan) return null;

    // Fetch all entity counts in parallel — one round-trip to the DB
    const [usersCount, partnersCount, journalEntryCount] =
      await Promise.all([
        this.prisma.user.count({
          where: { companyId, isDeleted: false, status: { not: 'DISABLED' } },
        }),
        this.prisma.businessPartner.count({
          where: { companyId, isActive: true },
        }),
        this.prisma.journalEntry.count({
          where: { companyId },
        }),
      ]);

    return {
      planName:           plan.planName,
      subscriptionStatus: plan.subscriptionStatus,
      endDate:            plan.endDate,
      features:           plan.features,
      quotas: {
        users:         this.buildQuotaStatus(plan.maxUsers,         usersCount),
        customers:     this.buildQuotaStatus(plan.maxCustomers,     partnersCount),
        suppliers:     this.buildQuotaStatus(plan.maxSuppliers,     partnersCount),
        employees:     this.buildQuotaStatus(plan.maxEmployees,     0),
        ledgerEntries: this.buildQuotaStatus(plan.maxLedgerEntries, journalEntryCount),
      },
    };
  }

  /**
   * Invalidate cached plan data for a company.
   *
   * Call this after ANY of the following mutations:
   *   - Plan updated (features, limits changed)
   *   - Subscription activated / extended / suspended / expired
   *   - Company moved to a different plan
   *
   * This is the ONLY cache invalidation trigger — keep it simple.
   */
  async invalidate(companyId: string): Promise<void> {
    await this.cache.del(this.cacheKey(companyId), CACHE_NAMESPACE);
    this.logger.debug(`Entitlement cache cleared for company ${companyId}`);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private cacheKey(companyId: string): string {
    return `company:${companyId}`;
  }

  /**
   * Load plan data from cache or DB.
   * Only entitled statuses (ACTIVE | TRIAL) are cached and returned.
   */
  private async loadPlanData(companyId: string): Promise<CachedPlanData | null> {
    // 1. Cache hit
    const cached = await this.cache.get<CachedPlanData>(
      this.cacheKey(companyId),
      CACHE_NAMESPACE,
    );
    if (cached) return cached;

    // 2. DB fetch — only ACTIVE | TRIAL subscriptions grant entitlements
    const sub = await this.prisma.companySubscription.findFirst({
      where: {
        companyId,
        status: { in: SubscriptionGovernanceService.ENTITLED_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id:      true,
        status:  true,
        endDate: true,
        plan: {
          select: {
            id:               true,
            name:             true,
            features:         true,
            maxUsers:         true,
            maxCustomers:     true,
            maxSuppliers:     true,
            maxEmployees:     true,
            maxLedgerEntries: true,
          },
        },
      },
    });

    if (!sub) return null;

    const data: CachedPlanData = {
      subscriptionId:     sub.id,
      subscriptionStatus: sub.status,
      endDate:            sub.endDate.toISOString(),
      planId:             sub.plan.id,
      planName:           sub.plan.name,
      // Store raw strings from DB — filterValidFeatureKeys on read if needed
      features:           sub.plan.features as string[],
      maxUsers:           sub.plan.maxUsers,
      maxCustomers:       sub.plan.maxCustomers,
      maxSuppliers:       sub.plan.maxSuppliers,
      maxEmployees:       sub.plan.maxEmployees,
      // BigInt → string for JSON serialization safety
      maxLedgerEntries:   sub.plan.maxLedgerEntries?.toString() ?? null,
    };

    // 3. Store in cache
    await this.cache.set(this.cacheKey(companyId), data, {
      ttl:       CACHE_TTL_SECONDS,
      namespace: CACHE_NAMESPACE,
    });

    return data;
  }

  /**
   * Read the current count for a quota type, using the correct Prisma client
   * (transaction or main). This must match the counting logic in the repositories
   * so that quota decisions are consistent with what the listings show.
   */
  private async resolveQuotaCounts(
    companyId: string,
    quotaType: QuotaType,
    plan:      CachedPlanData,
    tx?:       Prisma.TransactionClient,
  ): Promise<{ limit: number | null; current: number }> {
    // Use the transaction client if provided — critical for race-safety
    const db = tx ?? this.prisma;

    switch (quotaType) {
      case 'users': {
        const limit = plan.maxUsers;
        if (limit === null) return { limit: null, current: 0 };
        const current = await db.user.count({
          where: { companyId, isDeleted: false, status: { not: 'DISABLED' } },
        });
        return { limit, current };
      }

      case 'customers': {
        const limit = plan.maxCustomers;
        if (limit === null) return { limit: null, current: 0 };
        const current = await db.businessPartner.count({
          where: { companyId, isActive: true },
        });
        return { limit, current };
      }

      case 'suppliers': {
        const limit = plan.maxSuppliers;
        if (limit === null) return { limit: null, current: 0 };
        const current = await db.businessPartner.count({
          where: { companyId, isActive: true },
        });
        return { limit, current };
      }

      case 'employees': {
        const limit = plan.maxEmployees;
        if (limit === null) return { limit: null, current: 0 };
        const current = 0;
        return { limit, current };
      }

      case 'ledgerEntries': {
        const rawLimit = plan.maxLedgerEntries;
        if (rawLimit === null) return { limit: null, current: 0 };
        const limit = parseInt(rawLimit, 10);
        const current = await db.journalEntry.count({
          where: { companyId },
        });
        return { limit, current };
      }

      default: {
        // TypeScript exhaustiveness check — will fail to compile if a new
        // QuotaType is added without handling it here.
        const _exhaustive: never = quotaType;
        this.logger.error(`Unknown quota type: ${String(_exhaustive)}`);
        return { limit: null, current: 0 };
      }
    }
  }

  /**
   * Build a QuotaStatus object for a single entity type.
   * Accepts the raw limit value (which may be a BigInt string for ledgerEntries).
   */
  private buildQuotaStatus(
    rawLimit: number | string | null,
    current:  number,
  ): QuotaStatus {
    if (rawLimit === null) {
      return { limit: null, current, isUnlimited: true, isAtLimit: false, usagePercent: null };
    }

    const limit = typeof rawLimit === 'string' ? parseInt(rawLimit, 10) : rawLimit;
    const isAtLimit    = current >= limit;
    const usagePercent = limit > 0 ? Math.round((current / limit) * 100) : 0;

    return { limit, current, isUnlimited: false, isAtLimit, usagePercent };
  }
}

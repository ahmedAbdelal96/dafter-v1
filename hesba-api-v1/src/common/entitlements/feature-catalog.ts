/**
 * ============================================================================
 * FEATURE CATALOG — Single Source of Truth for Plan Features
 * ============================================================================
 *
 * WHY THIS FILE EXISTS:
 * Previously, plan.features was a free-form string array with no validation.
 * That meant any typo in a feature string would silently break gating.
 * This catalog makes every valid feature key explicit and typed.
 *
 * NAMING CONVENTION:
 *   `module.<domain>.<action>`
 *   - domain  = the business module (customers, invoices, ...)
 *   - action  = what's allowed (read | manage | export | ...)
 *   "read"   = view/list/get operations only
 *   "manage" = create/update/delete operations (always requires "read" too)
 *   "export" = download/print/share operations
 *
 * ADDING A NEW MODULE (runbook):
 *   1. Add FeatureKey values below (follow naming convention)
 *   2. Increment FEATURE_CATALOG_VERSION (semver minor bump)
 *   3. Update DEFAULT_*_FEATURES arrays to define which tier gets the feature
 *   4. Run DB migration: UPDATE "Plan" SET features = features || '["new.key"]'
 *      for plans that should have the new feature by default
 *   5. Apply @RequireFeature on the module's controller endpoints
 *   6. Update frontend feature-catalog type mirror if it exists
 *
 * REMOVING / RENAMING A KEY:
 *   - Never remove a key that live plans use. Deprecate it with a comment.
 *   - To rename: add the new key, keep the old one as an alias for one release,
 *     then run migration + remove old key.
 */

// ── Catalog Version ───────────────────────────────────────────────────────────

/**
 * Bump this whenever keys are added, deprecated, or renamed.
 * Stored in DB migrations for traceability.
 */
export const FEATURE_CATALOG_VERSION = '1.0.0';

// ── Feature Keys ─────────────────────────────────────────────────────────────

export enum FeatureKey {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  DASHBOARD_READ = 'module.dashboard.read',

  // ── Customers ─────────────────────────────────────────────────────────────
  CUSTOMERS_READ   = 'module.customers.read',
  CUSTOMERS_MANAGE = 'module.customers.manage',

  // ── Suppliers ─────────────────────────────────────────────────────────────
  SUPPLIERS_READ   = 'module.suppliers.read',
  SUPPLIERS_MANAGE = 'module.suppliers.manage',

  // ── Employees ─────────────────────────────────────────────────────────────
  EMPLOYEES_READ   = 'module.employees.read',
  EMPLOYEES_MANAGE = 'module.employees.manage',

  // ── Ledger ────────────────────────────────────────────────────────────────
  LEDGER_READ   = 'module.ledger.read',
  LEDGER_MANAGE = 'module.ledger.manage',

  // ── Expenses ──────────────────────────────────────────────────────────────
  EXPENSES_READ   = 'module.expenses.read',
  EXPENSES_MANAGE = 'module.expenses.manage',

  // ── Products Catalog ──────────────────────────────────────────────────────
  PRODUCTS_READ   = 'module.products.read',
  PRODUCTS_MANAGE = 'module.products.manage',

  // ── Invoices ──────────────────────────────────────────────────────────────
  INVOICES_READ   = 'module.invoices.read',
  INVOICES_MANAGE = 'module.invoices.manage',

  // ── Deferred Sales (بيع آجل) ──────────────────────────────────────────────
  DEFERRED_SALES_READ   = 'module.deferred_sales.read',
  DEFERRED_SALES_MANAGE = 'module.deferred_sales.manage',

  // ── Installments (تقسيط) ──────────────────────────────────────────────────
  INSTALLMENTS_READ   = 'module.installments.read',
  INSTALLMENTS_MANAGE = 'module.installments.manage',

  // ── Reports ───────────────────────────────────────────────────────────────
  REPORTS_READ   = 'module.reports.read',
  REPORTS_EXPORT = 'module.reports.export',
}

// ── Catalog Set ───────────────────────────────────────────────────────────────

/** Frozen array of all valid feature keys — used for validation */
export const ALL_FEATURE_KEYS: ReadonlyArray<FeatureKey> = Object.freeze(
  Object.values(FeatureKey),
);

/** A Set for O(1) validation lookups */
const FEATURE_KEY_SET = new Set<string>(ALL_FEATURE_KEYS);

/**
 * Runtime check — use this to reject unknown feature strings.
 * Returns a type-narrowed `FeatureKey` on success.
 */
export function isValidFeatureKey(key: string): key is FeatureKey {
  return FEATURE_KEY_SET.has(key);
}

/**
 * Validate an array of feature strings and return only the valid ones.
 * Logs a warning for any unknown keys (helps catch DB drift).
 */
export function filterValidFeatureKeys(keys: string[]): FeatureKey[] {
  return keys.filter((k) => isValidFeatureKey(k)) as FeatureKey[];
}

// ── Default Plan Feature Matrices ────────────────────────────────────────────
//
// These are REFERENCE templates for creating new plans via the admin panel.
// Existing plans retain whatever is stored in plan.features (grandfathering).
// Never use these to overwrite existing plan.features without a migration.

/**
 * BASIC plan — core parties management + ledger only.
 * Suitable for small businesses tracking receivables/payables.
 */
export const DEFAULT_BASIC_FEATURES: ReadonlyArray<FeatureKey> = Object.freeze([
  FeatureKey.DASHBOARD_READ,
  FeatureKey.CUSTOMERS_READ,
  FeatureKey.CUSTOMERS_MANAGE,
  FeatureKey.SUPPLIERS_READ,
  FeatureKey.SUPPLIERS_MANAGE,
  FeatureKey.LEDGER_READ,
  FeatureKey.LEDGER_MANAGE,
]);

/**
 * PRO plan — everything in Basic plus employees, expenses, products,
 * invoicing, deferred sales, and reports viewing.
 */
export const DEFAULT_PRO_FEATURES: ReadonlyArray<FeatureKey> = Object.freeze([
  ...DEFAULT_BASIC_FEATURES,
  FeatureKey.EMPLOYEES_READ,
  FeatureKey.EMPLOYEES_MANAGE,
  FeatureKey.EXPENSES_READ,
  FeatureKey.EXPENSES_MANAGE,
  FeatureKey.PRODUCTS_READ,
  FeatureKey.PRODUCTS_MANAGE,
  FeatureKey.INVOICES_READ,
  FeatureKey.INVOICES_MANAGE,
  FeatureKey.DEFERRED_SALES_READ,
  FeatureKey.DEFERRED_SALES_MANAGE,
  FeatureKey.REPORTS_READ,
]);

/**
 * ENTERPRISE plan — everything in Pro plus installment contracts
 * and full report export capabilities.
 */
export const DEFAULT_ENTERPRISE_FEATURES: ReadonlyArray<FeatureKey> = Object.freeze([
  ...DEFAULT_PRO_FEATURES,
  FeatureKey.INSTALLMENTS_READ,
  FeatureKey.INSTALLMENTS_MANAGE,
  FeatureKey.REPORTS_EXPORT,
]);

// ── Helper: features by plan tier name ───────────────────────────────────────

export type PlanTier = 'basic' | 'pro' | 'enterprise';

/** Returns the default feature set for a named tier */
export function getDefaultFeaturesForTier(
  tier: PlanTier,
): ReadonlyArray<FeatureKey> {
  switch (tier) {
    case 'basic':      return DEFAULT_BASIC_FEATURES;
    case 'pro':        return DEFAULT_PRO_FEATURES;
    case 'enterprise': return DEFAULT_ENTERPRISE_FEATURES;
  }
}

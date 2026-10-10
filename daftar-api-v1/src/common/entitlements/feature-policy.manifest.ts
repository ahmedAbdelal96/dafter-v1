export type ControllerFeaturePolicy =
  | 'feature-gated'
  | 'role-guarded'
  | 'platform-admin'
  | 'auth-public';

/**
 * Explicit feature-policy intent for each controller.
 * This keeps policy decisions auditable and prevents accidental ungated growth.
 */
export const CONTROLLER_FEATURE_POLICY: Record<
  string,
  ControllerFeaturePolicy
> = {
  'audit/audit.controller.ts': 'platform-admin',
  'accounting/accounting.controller.ts': 'role-guarded',
  'accounting-bootstrap/accounting-bootstrap.controller.ts': 'role-guarded',
  'opening-balances/opening-balances.controller.ts': 'role-guarded',
  'business-partners/business-partners.controller.ts': 'role-guarded',
  'customer-payments/customer-payment.controller.ts': 'role-guarded',
  'payment-terms/payment-terms.controller.ts': 'role-guarded',
  'auth/auth.controller.ts': 'auth-public',
  'cash-reconciliation/cash-reconciliation.controller.ts': 'role-guarded',
  'companies/companies.controller.ts': 'role-guarded',
  'entitlements/entitlements.controller.ts': 'platform-admin',
  'expenses/expenses.controller.ts': 'feature-gated',
  'notifications/notifications.controller.ts': 'role-guarded',
  'platform/platform.controller.ts': 'platform-admin',
  'platform-audit/platform-audit.controller.ts': 'platform-admin',
  'platform-dashboard/platform-dashboard.controller.ts': 'platform-admin',
  'products/products.controller.ts': 'feature-gated',
  'sales/sales-invoice.controller.ts': 'role-guarded',
  'sales/sales-credit-note.controller.ts': 'role-guarded',
  'tax-setup/controllers/tax-setup.controller.ts': 'role-guarded',
  'users/users.controller.ts': 'role-guarded',
};

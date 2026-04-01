/**
 * Dashboard Feature Types — Daftar Mobile
 *
 * These types mirror the backend response shapes from:
 *   dafter-api-v1/src/modules/dashboard/dashboard.repository.ts
 *
 * ⚠️  All Decimal fields from Prisma arrive as STRINGS.
 *     Always: parseFloat(String(value)) before any arithmetic or display.
 */

// ─── Period Preset ─────────────────────────────────────────────────────────────

/**
 * Matches DashboardPeriodPreset enum in the backend DTO.
 * Used as the `preset` query param for all dashboard endpoints.
 */
export type DashboardPeriodPreset =
  | 'today'
  | 'week'
  | 'month'
  | 'year'
  | 'last30days';

// ─── Overview ─────────────────────────────────────────────────────────────────

export interface DashboardCompany {
  id: string;
  name: string;
  currencyCode: string;
}

export interface DashboardPeriod {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  preset: string;
}

/** Financial KPIs — all Decimal fields arrive as strings from Prisma */
export interface DashboardKpis {
  totalSales: string;        // total sales in period
  totalExpenses: string;     // total expenses in period
  netProfit: string;         // totalSales - totalExpenses
  collectionAmount: string;  // cash actually collected
  receivables: string;       // total owed TO the company (customers)
  payables: string;          // total owed BY the company (suppliers)
  cashNetFlow: string;       // net cash movement
}

/** Operational counts — plain integers */
export interface DashboardOperations {
  invoicesCount: number;
  deferredSalesCount: number;
  installmentContractsCount: number;
  overdueCount: number;
  activeCustomers: number;
  activeProducts: number;
  activeEmployees: number;
}

/**
 * Alert counts embedded inside the overview response.
 * When any count > 0, show an alert section on the dashboard.
 */
export interface DashboardAlertCounts {
  overdueDeferredSales: number;
  overdueInstallments: number;
  customersNearCreditLimit: number;
  criticalNegativeBalances: number;
}

/** Full response from GET /dashboard/overview */
export interface DashboardOverview {
  company: DashboardCompany;
  period: DashboardPeriod;
  kpis: DashboardKpis;
  operations: DashboardOperations;
  alerts: DashboardAlertCounts;
}

// ─── Alerts Detail ────────────────────────────────────────────────────────────

export type AlertType =
  | 'OVERDUE_DEFERRED'
  | 'OVERDUE_INSTALLMENT'
  | 'CREDIT_LIMIT_RISK'
  | 'CRITICAL_PAYABLE';

export type AlertSeverity = 'low' | 'medium' | 'high';

export interface DashboardAlertItem {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  amount?: string;   // Decimal string
  dueDate?: string;  // YYYY-MM-DD
}

export interface DashboardAlertsResponse {
  items: DashboardAlertItem[];
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface DashboardQueryParams {
  preset?: DashboardPeriodPreset;
  dateFrom?: string;
  dateTo?: string;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

/** Period option shown in the PeriodSelector chip strip */
export interface PeriodOption {
  key: DashboardPeriodPreset;
  labelKey: string; // i18n key under dashboard.period.*
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { key: 'today',  labelKey: 'today'  },
  { key: 'week',   labelKey: 'week'   },
  { key: 'month',  labelKey: 'month'  },
  { key: 'year',   labelKey: 'year'   },
];

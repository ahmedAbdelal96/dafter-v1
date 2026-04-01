// ─── Reports Feature — Types ──────────────────────────────────────────────────
// Read-only analytics — no mutations.
// All Decimal fields arrive as strings over HTTP.

// ─── Constants ────────────────────────────────────────────────────────────────

export const REPORTS_ACCENT = '#1d4ed8'; // blue-700
export const REPORTS_ACCENT_LIGHT = '#eff6ff';

// ─── Date presets ─────────────────────────────────────────────────────────────

export type DatePreset = 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR';

export const DATE_PRESETS: DatePreset[] = [
  'THIS_MONTH',
  'LAST_3_MONTHS',
  'THIS_YEAR',
];

/** Compute dateFrom / dateTo ISO strings for a given preset */
export function getPresetDates(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const to = fmt(today);
  let from: Date;

  switch (preset) {
    case 'THIS_MONTH':
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'LAST_3_MONTHS':
      from = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      break;
    case 'THIS_YEAR':
      from = new Date(today.getFullYear(), 0, 1);
      break;
  }

  return { dateFrom: fmt(from), dateTo: to };
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface ReportsSummary {
  /** Prisma Decimal → string */
  totalReceivables: string;
  deferredSales: {
    total: number;
    totalAmount: string;
    paidAmount: string;
    remainingAmount: string;
    overdueCount: number;
    overdueAmount: string;
  };
  installments: {
    activeContracts: number;
    totalAmount: string;
    paidAmount: string;
    remainingAmount: string;
    overdueSchedules: number;
    overdueAmount: string;
  };
}

export interface SummaryParams {
  dateFrom?: string; // YYYY-MM-DD (optional on summary)
  dateTo?: string;
}

// ─── Overdue ──────────────────────────────────────────────────────────────────

/** A single overdue deferred-sale row */
export interface OverdueDeferredSaleItem {
  id: string;
  referenceNumber: string;
  partyName: string;
  partyPhone: string | null;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  dueDate: string; // ISO date string
  daysOverdue: number;
}

/** A single overdue installment-schedule row */
export interface OverdueScheduleItem {
  scheduleId: string;
  contractNumber: string;
  installmentNumber: number;
  partyName: string;
  amount: string;
  paidAmount: string;
  remainingAmount: string;
  dueDate: string; // ISO date string
  daysOverdue: number;
}

export interface OverdueReport {
  deferredSales: OverdueDeferredSaleItem[];
  installmentSchedules: OverdueScheduleItem[];
}

// ─── Collection Schedule ──────────────────────────────────────────────────────

export type CollectionItemType = 'DEFERRED' | 'INSTALLMENT';

export interface CollectionItem {
  type: CollectionItemType;
  referenceNumber: string;
  dueDate: string; // ISO date string
  partyName: string;
  partyPhone: string | null;
  expectedAmount: string;
  daysUntilDue: number;
}

/** Backend returns array directly (not wrapped in { items: [] }) */
export type CollectionSchedule = CollectionItem[];

export interface CollectionParams {
  dateFrom: string;
  dateTo: string;
}

// ─── Sprint 2 report endpoints ────────────────────────────────────────────────

export interface DateRangeParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface ProfitLossReport {
  period: {
    dateFrom: string;
    dateTo: string;
    days: number;
  };
  revenue: {
    invoicesCount: number;
    grossSales: string;
    taxAmount: string;
    netSales: string;
  };
  expenses: {
    expensesCount: number;
    total: string;
  };
  profit: {
    grossProfit: string;
    netProfit: string;
    marginPercent: string;
  };
}

export interface CashFlowReport {
  period: {
    dateFrom: string;
    dateTo: string;
    days: number;
  };
  totals: {
    openingBalance: string;
    inflow: string;
    outflow: string;
    netChange: string;
    closingBalance: string;
  };
  items: {
    date: string;
    inflow: string;
    outflow: string;
    net: string;
    closingBalance: string;
  }[];
}

export interface AgingReport {
  asOfDate: string;
  summary: {
    partiesCount: number;
    totalOutstanding: string;
    bucket_0_30: string;
    bucket_31_60: string;
    bucket_61_90: string;
    bucket_90_plus: string;
  };
  items: {
    partyId: string;
    name: string;
    phone: string | null;
    isActive: boolean;
    totalOutstanding: string;
    bucket_0_30: string;
    bucket_31_60: string;
    bucket_61_90: string;
    bucket_90_plus: string;
    oldestDueDate: string | null;
    lastTransactionDate: string | null;
  }[];
}

export interface SalesDetailedReport {
  summary: {
    invoicesCount: number;
    grossAmount: string;
    taxAmount: string;
    netAmount: string;
  };
  items: {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    partyType: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';
    partyId: string;
    partyName: string;
    totalAmount: string;
    taxAmount: string;
    netAmount: string;
    saleType: 'INVOICE' | 'DEFERRED';
  }[];
}

export interface CollectionsFollowupReport {
  period: {
    dateFrom: string;
    dateTo: string;
  };
  summary: {
    expectedAmount: string;
    collectedAmount: string;
    collectionRatePercent: string;
    overdueOutstanding: string;
  };
  items: {
    invoiceId: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    customerId: string;
    customerName: string;
    expectedAmount: string;
    paidAmount: string;
    remainingAmount: string;
    status: string;
    daysOverdue: number;
  }[];
}

// ─── Extended Reports (Sprint 3) ─────────────────────────────────────────────

export interface ExpensesAnalyticsReport {
  period: { dateFrom: string; dateTo: string };
  summary: {
    totalAmount: string;
    expensesCount: number;
    averageExpense: string;
    byCategoryCount: number;
  };
  byCategory: { category: string; total: string; count: number }[];
  items: {
    id: string;
    date: string;
    category: string;
    amount: string;
    supplierName: string | null;
    description: string | null;
  }[];
}

export interface DebtsSummaryReport {
  summary: {
    customersReceivable: string;
    customersCredit: string;
    suppliersReceivable: string;
    suppliersPayable: string;
    netReceivable: string;
  };
  items: {
    entityType: 'CUSTOMER' | 'SUPPLIER';
    entityId: string;
    name: string;
    phone: string | null;
    isActive: boolean;
    balanceType: 'RECEIVABLE' | 'PAYABLE';
    amount: string;
  }[];
}

export interface ProductsPerformanceReport {
  period: { dateFrom: string; dateTo: string };
  summary: {
    totalProducts: number;
    totalQuantity: number;
    totalSalesAmount: string;
  };
  items: {
    productId: string;
    productName: string;
    sku: string | null;
    category: string | null;
    quantitySold: number;
    salesAmount: string;
    averageUnitPrice: string;
    invoicesCount: number;
  }[];
}

export interface OperationalPerformanceReport {
  period: { dateFrom: string; dateTo: string };
  revenue: { invoicesCount: number; revenue: string; avgInvoiceValue: string };
  expenses: { total: string };
  collections: { collectionRate: string };
}

export interface CriticalAlertsReport {
  summary: {
    creditRiskCount: number;
    largeOverduesCount: number;
    upcomingInstallmentsCount: number;
    expensesSpikeAlert: boolean;
  };
  creditRisk: { customerId: string; name: string; balance: string; creditLimit: string | null }[];
  largeOverdues: { entityId: string; name: string; entityType: string; overdueAmount: string; daysOverdue: number }[];
  upcomingInstallments: { scheduleId: string; contractNumber: string; partyName: string; amount: string; dueDate: string; daysUntilDue: number }[];
}

export interface StaffActivityReport {
  period: { dateFrom: string; dateTo: string };
  summary: {
    usersCount: number;
    totalActivities: number;
    totalInvoices: number;
    totalInvoiceAmount: string;
    totalCollections: string;
    totalExpenses: string;
  };
  items: {
    userId: string;
    fullName: string;
    email: string;
    role: string;
    activitiesCount: number;
    invoicesCount: number;
    invoicesAmount: string;
    collectionsAmount: string;
    expensesAmount: string;
    lastActivityAt: string | null;
  }[];
}

// ─── Ledger Statement Report ──────────────────────────────────────────────────

export type LedgerPartyType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';

export interface LedgerStatementParams {
  partyType: LedgerPartyType;
  partyId: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface LedgerStatementItem {
  id: string;
  date: string;
  dueDate: string | null;
  entryType: string;
  note: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface LedgerStatementReport {
  party: { id: string; name: string; partyType: LedgerPartyType };
  openingBalance: string;
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  currentBalance: string;
  items: LedgerStatementItem[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toFloat(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value));
  return isNaN(n) ? 0 : n;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

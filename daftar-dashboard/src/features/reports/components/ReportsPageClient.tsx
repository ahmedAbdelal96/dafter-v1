"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ComboboxOption } from "@/components/ui/combobox/Combobox";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { API_LIMITS } from "@/lib/api/config";
import {
  useCashReconciliationHistory,
  useCashReconciliationSummary,
  useCashFlowReport,
  useCollectionsFollowupReport,
  useCriticalAlertsReport,
  useCustomers,
  useCustomersAgingReport,
  useDebtsSummaryReport,
  useEmployees,
  useExpensesAnalyticsReport,
  useLedgerStatementReport,
  useOperationalPerformanceReport,
  useProductsPerformanceReport,
  useProfitLossReport,
  useReportsSummary,
  useSalesDetailedReport,
  useSimpleLedgerReport,
  useStaffActivityReport,
  useSuppliers,
  useSuppliersAgingReport,
  useUsers,
} from "@/lib/api/hooks";
import { reportsApi } from "@/lib/api/services";
import type {
  CollectionFlow,
  CollectionMetric,
  CollectionsFollowupFilters,
  DebtsSummaryFilters,
  PartyType,
  ReportSaleType,
  SimpleLedgerFilters,
  StaffActivityFilters,
} from "@/lib/api/types";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import { CollectionsFollowupSection } from "./CollectionsFollowupSection";
import { DebtsSummarySection } from "./DebtsSummarySection";
import {
  AgingSection,
  CashFlowSection,
  CriticalAlertsSection,
  ExpensesAnalyticsSection,
  LedgerStatementReportSection,
  OperationalPerformanceSection,
  ProductsPerformanceSection,
  ProfitLossSection,
  SalesDetailedSection,
} from "./ExtendedReportsSections";
import { ReportsOverviewSection } from "./ReportsOverviewSection";
import { SimpleLedgerSection } from "./SimpleLedgerSection";
import { StaffActivitySection } from "./StaffActivitySection";
import { DEFAULT_REPORTS_META, type ReportsTabKey } from "../utils/reports-schemas";
import { formatDate, formatDateTime, formatMoney } from "../utils/reports-format";

function getMonthDateRange() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export function ReportsPageClient() {
  const t = useTranslations("reports");
  const tCollections = useTranslations("reports.collectionsFollowup");
  const tDebts = useTranslations("reports.debtsSummary");
  const tStaff = useTranslations("reports.staffActivity");
  const tLedger = useTranslations("reports.simpleLedger");
  const locale = useLocale();
  const { hasPermission } = usePermission();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();
  const canView = hasPermission("reports:view");
  const canExport = hasPermission("reports:export");
  const canLookupUsers = hasPermission("users:view");

  const monthRange = useMemo(() => getMonthDateRange(), []);
  const [activeTab, setActiveTab] = useState<ReportsTabKey>("overview");
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportTarget, setExportTarget] = useState<ReportsTabKey>("collections-followup");

  const [overviewPartyType, setOverviewPartyType] = useState<"all" | PartyType>("all");
  const [overviewDateFrom, setOverviewDateFrom] = useState(monthRange.from);
  const [overviewDateTo, setOverviewDateTo] = useState(monthRange.to);

  const [profitLossDateFrom, setProfitLossDateFrom] = useState(monthRange.from);
  const [profitLossDateTo, setProfitLossDateTo] = useState(monthRange.to);
  const [profitLossComparePrevious, setProfitLossComparePrevious] = useState(true);

  const [cashFlowDateFrom, setCashFlowDateFrom] = useState(monthRange.from);
  const [cashFlowDateTo, setCashFlowDateTo] = useState(monthRange.to);
  const [cashFlowPage, setCashFlowPage] = useState(1);
  const [cashFlowLimit, setCashFlowLimit] = useState(10);

  const [customersAgingSearch, setCustomersAgingSearch] = useState("");
  const [customersAgingAsOfDate, setCustomersAgingAsOfDate] = useState(monthRange.to);
  const [customersAgingIsActive, setCustomersAgingIsActive] = useState<"all" | "true" | "false">("all");
  const [customersAgingPage, setCustomersAgingPage] = useState(1);
  const [customersAgingLimit, setCustomersAgingLimit] = useState(10);

  const [suppliersAgingSearch, setSuppliersAgingSearch] = useState("");
  const [suppliersAgingAsOfDate, setSuppliersAgingAsOfDate] = useState(monthRange.to);
  const [suppliersAgingIsActive, setSuppliersAgingIsActive] = useState<"all" | "true" | "false">("all");
  const [suppliersAgingPage, setSuppliersAgingPage] = useState(1);
  const [suppliersAgingLimit, setSuppliersAgingLimit] = useState(10);

  const [salesSearch, setSalesSearch] = useState("");
  const [salesType, setSalesType] = useState<"all" | ReportSaleType>("all");
  const [salesPartyType, setSalesPartyType] = useState<"all" | PartyType>("all");
  const [salesDateFrom, setSalesDateFrom] = useState(monthRange.from);
  const [salesDateTo, setSalesDateTo] = useState(monthRange.to);
  const [salesPage, setSalesPage] = useState(1);
  const [salesLimit, setSalesLimit] = useState(10);

  const [collectionsPartyType, setCollectionsPartyType] = useState<"all" | PartyType>("all");
  const [collectionsPartyId, setCollectionsPartyId] = useState<string | undefined>(undefined);
  const [collectionsPartySearch, setCollectionsPartySearch] = useState("");
  const [collectionsDateFrom, setCollectionsDateFrom] = useState(monthRange.from);
  const [collectionsDateTo, setCollectionsDateTo] = useState(monthRange.to);
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [collectionsLimit, setCollectionsLimit] = useState(10);
  const [collectionsFlow, setCollectionsFlow] = useState<CollectionFlow | undefined>(undefined);
  const [collectionsMetric, setCollectionsMetric] = useState<CollectionMetric | undefined>(undefined);

  const [debtsSearch, setDebtsSearch] = useState("");
  const [debtsEntityType, setDebtsEntityType] = useState<"all" | "CUSTOMER" | "SUPPLIER">("all");
  const [debtsBalanceType, setDebtsBalanceType] = useState<"all" | "RECEIVABLE" | "PAYABLE">("all");
  const [debtsIsActive, setDebtsIsActive] = useState<"all" | "true" | "false">("all");
  const [debtsMinAmount, setDebtsMinAmount] = useState("");
  const [debtsPage, setDebtsPage] = useState(1);
  const [debtsLimit, setDebtsLimit] = useState(10);

  const [staffSearch, setStaffSearch] = useState("");
  const [staffUserId, setStaffUserId] = useState<string | undefined>(undefined);
  const [staffUserSearch, setStaffUserSearch] = useState("");
  const [staffDateFrom, setStaffDateFrom] = useState(monthRange.from);
  const [staffDateTo, setStaffDateTo] = useState(monthRange.to);
  const [staffPage, setStaffPage] = useState(1);
  const [staffLimit, setStaffLimit] = useState(10);

  const [ledgerPartyType, setLedgerPartyType] = useState<PartyType>("CUSTOMER");
  const [ledgerPartyId, setLedgerPartyId] = useState<string | undefined>(undefined);
  const [ledgerPartySearch, setLedgerPartySearch] = useState("");
  const [ledgerDateFrom, setLedgerDateFrom] = useState("");
  const [ledgerDateTo, setLedgerDateTo] = useState("");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLimit, setLedgerLimit] = useState(10);

  const [ledgerReportPartyType, setLedgerReportPartyType] = useState<PartyType>("CUSTOMER");
  const [ledgerReportPartyId, setLedgerReportPartyId] = useState<string | undefined>(undefined);
  const [ledgerReportPartySearch, setLedgerReportPartySearch] = useState("");

  const debouncedDebtsSearch = useDebouncedValue(debtsSearch, 350);
  const debouncedStaffSearch = useDebouncedValue(staffSearch, 350);
  const debouncedSalesSearch = useDebouncedValue(salesSearch, 350);
  const debouncedCustomersAgingSearch = useDebouncedValue(customersAgingSearch, 350);
  const debouncedSuppliersAgingSearch = useDebouncedValue(suppliersAgingSearch, 350);
  const debouncedCollectionsPartySearch = useDebouncedValue(collectionsPartySearch, 300);
  const debouncedLedgerPartySearch = useDebouncedValue(ledgerPartySearch, 300);
  const debouncedLedgerReportPartySearch = useDebouncedValue(ledgerReportPartySearch, 300);
  const debouncedStaffUserSearch = useDebouncedValue(staffUserSearch, 300);

  const customersQuery = useCustomers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search:
      collectionsPartyType === "CUSTOMER"
        ? debouncedCollectionsPartySearch || undefined
        : ledgerPartyType === "CUSTOMER"
          ? debouncedLedgerPartySearch || undefined
          : ledgerReportPartyType === "CUSTOMER"
            ? debouncedLedgerReportPartySearch || undefined
            : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const suppliersQuery = useSuppliers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search:
      collectionsPartyType === "SUPPLIER"
        ? debouncedCollectionsPartySearch || undefined
        : ledgerPartyType === "SUPPLIER"
          ? debouncedLedgerPartySearch || undefined
          : ledgerReportPartyType === "SUPPLIER"
            ? debouncedLedgerReportPartySearch || undefined
            : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const employeesQuery = useEmployees({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search:
      collectionsPartyType === "EMPLOYEE"
        ? debouncedCollectionsPartySearch || undefined
        : ledgerPartyType === "EMPLOYEE"
          ? debouncedLedgerPartySearch || undefined
          : ledgerReportPartyType === "EMPLOYEE"
            ? debouncedLedgerReportPartySearch || undefined
            : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const usersQuery = useUsers(
    {
      page: 1,
      limit: API_LIMITS.LOOKUP_LIMIT,
      status: "ACTIVE",
      search: debouncedStaffUserSearch || undefined,
      sortBy: "fullName",
      sortOrder: "asc",
    },
    canView && canLookupUsers && activeTab === "staff-activity"
  );

  const overviewQuery = useReportsSummary(
    {
      dateFrom: overviewDateFrom || undefined,
      dateTo: overviewDateTo || undefined,
      partyType: overviewPartyType === "all" ? undefined : overviewPartyType,
    },
    canView && activeTab === "overview"
  );

  const profitLossQuery = useProfitLossReport(
    {
      dateFrom: profitLossDateFrom || undefined,
      dateTo: profitLossDateTo || undefined,
      comparePrevious: profitLossComparePrevious,
    },
    canView && activeTab === "profit-loss"
  );

  const cashFlowQuery = useCashFlowReport(
    {
      page: cashFlowPage,
      limit: cashFlowLimit,
      dateFrom: cashFlowDateFrom || undefined,
      dateTo: cashFlowDateTo || undefined,
    },
    canView && activeTab === "cash-flow"
  );

  const customersAgingQuery = useCustomersAgingReport(
    {
      page: customersAgingPage,
      limit: customersAgingLimit,
      asOfDate: customersAgingAsOfDate || undefined,
      search: debouncedCustomersAgingSearch || undefined,
      isActive:
        customersAgingIsActive === "all" ? undefined : customersAgingIsActive === "true",
    },
    canView && activeTab === "customers-aging"
  );

  const suppliersAgingQuery = useSuppliersAgingReport(
    {
      page: suppliersAgingPage,
      limit: suppliersAgingLimit,
      asOfDate: suppliersAgingAsOfDate || undefined,
      search: debouncedSuppliersAgingSearch || undefined,
      isActive:
        suppliersAgingIsActive === "all" ? undefined : suppliersAgingIsActive === "true",
    },
    canView && activeTab === "suppliers-aging"
  );

  const salesDetailedQuery = useSalesDetailedReport(
    {
      page: salesPage,
      limit: salesLimit,
      dateFrom: salesDateFrom || undefined,
      dateTo: salesDateTo || undefined,
      partyType: salesPartyType === "all" ? undefined : salesPartyType,
      saleType: salesType === "all" ? undefined : salesType,
      search: debouncedSalesSearch || undefined,
    },
    canView && activeTab === "sales-detailed"
  );

  const expensesAnalyticsQuery = useExpensesAnalyticsReport(
    {
      page: 1,
      limit: 20,
      dateFrom: monthRange.from,
      dateTo: monthRange.to,
      comparePrevious: true,
    },
    canView && activeTab === "expenses-analytics"
  );

  const productsPerformanceQuery = useProductsPerformanceReport(
    {
      page: 1,
      limit: 20,
      dateFrom: monthRange.from,
      dateTo: monthRange.to,
    },
    canView && activeTab === "products-performance"
  );

  const operationalPerformanceQuery = useOperationalPerformanceReport(
    {
      dateFrom: monthRange.from,
      dateTo: monthRange.to,
      comparePrevious: true,
    },
    canView && activeTab === "operational-performance"
  );

  const criticalAlertsQuery = useCriticalAlertsReport(
    { asOfDate: monthRange.to, creditUsageThresholdPercent: 80, largeOverdueAmount: 5000, upcomingInstallmentsDays: 7, limit: 10 },
    canView && activeTab === "critical-alerts"
  );

  const ledgerStatementQuery = useLedgerStatementReport(
    {
      page: 1,
      limit: 10,
      partyType: ledgerReportPartyType,
      partyId: ledgerReportPartyId ?? "",
      dateFrom: monthRange.from,
      dateTo: monthRange.to,
    },
    canView && activeTab === "ledger-statement" && Boolean(ledgerReportPartyId)
  );

  const collectionsFilters: CollectionsFollowupFilters = {
    page: collectionsPage,
    limit: collectionsLimit,
    dateFrom: collectionsDateFrom || undefined,
    dateTo: collectionsDateTo || undefined,
    partyType: collectionsPartyType === "all" ? undefined : collectionsPartyType,
    partyId: collectionsPartyId,
    flow: collectionsFlow,
    metric: collectionsMetric,
    sortOrder: "asc",
  };

  const collectionsQuery = useCollectionsFollowupReport(
    collectionsFilters,
    canView && activeTab === "collections-followup"
  );

  const debtsFilters: DebtsSummaryFilters = {
    page: debtsPage,
    limit: debtsLimit,
    sortBy: "amount",
    sortOrder: "desc",
    search: debouncedDebtsSearch || undefined,
    entityType: debtsEntityType === "all" ? undefined : debtsEntityType,
    balanceType: debtsBalanceType === "all" ? undefined : debtsBalanceType,
    isActive: debtsIsActive === "all" ? undefined : debtsIsActive === "true",
    minAmount: debtsMinAmount ? Number(debtsMinAmount) : undefined,
  };

  const debtsQuery = useDebtsSummaryReport(debtsFilters, canView && activeTab === "debts-summary");

  const staffFilters: StaffActivityFilters = {
    page: staffPage,
    limit: staffLimit,
    sortBy: "activitiesCount",
    sortOrder: "desc",
    dateFrom: staffDateFrom || undefined,
    dateTo: staffDateTo || undefined,
    userId: staffUserId,
    search: debouncedStaffSearch || undefined,
  };

  const staffQuery = useStaffActivityReport(staffFilters, canView && activeTab === "staff-activity");

  const ledgerFilters: SimpleLedgerFilters = {
    page: ledgerPage,
    limit: ledgerLimit,
    partyType: ledgerPartyType,
    partyId: ledgerPartyId ?? "",
    dateFrom: ledgerDateFrom || undefined,
    dateTo: ledgerDateTo || undefined,
  };

  const ledgerQuery = useSimpleLedgerReport(
    ledgerFilters,
    canView && activeTab === "simple-ledger" && Boolean(ledgerPartyId)
  );

  const operationalCashSummaryQuery = useCashReconciliationSummary(
    {
      dateFrom: monthRange.from,
      dateTo: monthRange.to,
    }
  );
  const operationalCashHistoryQuery = useCashReconciliationHistory({
    page: 1,
    limit: 5,
    status: "CLOSED",
    dateFrom: monthRange.from,
    dateTo: monthRange.to,
  });

  const collectionsPartyOptions = useMemo<ComboboxOption[]>(() => {
    const customers = (customersQuery.data?.items ?? []).map((row) => ({
      value: row.id,
      label: `${row.name} (${t("partyType.customer")})`,
    }));
    const suppliers = (suppliersQuery.data?.items ?? []).map((row) => ({
      value: row.id,
      label: `${row.name} (${t("partyType.supplier")})`,
    }));
    const employees = (employeesQuery.data?.items ?? []).map((row) => ({
      value: row.id,
      label: `${row.name} (${t("partyType.employee")})`,
    }));

    if (collectionsPartyType === "CUSTOMER") return customers;
    if (collectionsPartyType === "SUPPLIER") return suppliers;
    if (collectionsPartyType === "EMPLOYEE") return employees;

    return [...customers, ...suppliers, ...employees];
  }, [collectionsPartyType, customersQuery.data?.items, employeesQuery.data?.items, suppliersQuery.data?.items, t]);

  const simpleLedgerPartyOptions = useMemo<ComboboxOption[]>(() => {
    if (ledgerPartyType === "CUSTOMER") {
      return (customersQuery.data?.items ?? []).map((row) => ({ value: row.id, label: row.name }));
    }
    if (ledgerPartyType === "SUPPLIER") {
      return (suppliersQuery.data?.items ?? []).map((row) => ({ value: row.id, label: row.name }));
    }
    return (employeesQuery.data?.items ?? []).map((row) => ({ value: row.id, label: row.name }));
  }, [customersQuery.data?.items, employeesQuery.data?.items, ledgerPartyType, suppliersQuery.data?.items]);

  const ledgerReportPartyOptions = useMemo<ComboboxOption[]>(() => {
    if (ledgerReportPartyType === "CUSTOMER") {
      return (customersQuery.data?.items ?? []).map((row) => ({ value: row.id, label: row.name }));
    }
    if (ledgerReportPartyType === "SUPPLIER") {
      return (suppliersQuery.data?.items ?? []).map((row) => ({ value: row.id, label: row.name }));
    }
    return (employeesQuery.data?.items ?? []).map((row) => ({ value: row.id, label: row.name }));
  }, [customersQuery.data?.items, employeesQuery.data?.items, ledgerReportPartyType, suppliersQuery.data?.items]);

  const staffUserOptions = useMemo<ComboboxOption[]>(
    () =>
      (usersQuery.data?.items ?? []).map((user) => ({
        value: user.id,
        label: user.fullName,
        subtitle: user.email,
      })),
    [usersQuery.data?.items]
  );

  const tabs = useMemo<Array<{ key: ReportsTabKey; label: string }>>(
    () => [
      { key: "overview", label: t("tabs.overview") },
      { key: "profit-loss", label: t("tabs.profitLoss") },
      { key: "cash-flow", label: t("tabs.cashFlow") },
      { key: "customers-aging", label: t("tabs.customersAging") },
      { key: "suppliers-aging", label: t("tabs.suppliersAging") },
      { key: "sales-detailed", label: t("tabs.salesDetailed") },
      { key: "expenses-analytics", label: t("tabs.expensesAnalytics") },
      { key: "products-performance", label: t("tabs.productsPerformance") },
      { key: "operational-performance", label: t("tabs.operationalPerformance") },
      { key: "critical-alerts", label: t("tabs.criticalAlerts") },
      { key: "ledger-statement", label: t("tabs.ledgerStatement") },
      { key: "collections-followup", label: t("tabs.collectionsFollowup") },
      { key: "debts-summary", label: t("tabs.debtsSummary") },
      { key: "staff-activity", label: t("tabs.staffActivity") },
      { key: "simple-ledger", label: t("tabs.simpleLedger") },
    ],
    [t]
  );
  const recommendedTabs = useMemo<ReportsTabKey[]>(
    () => ["overview", "profit-loss", "cash-flow", "collections-followup", "critical-alerts"],
    []
  );
  const secondaryTabs = useMemo(
    () => tabs.filter((tab) => !recommendedTabs.includes(tab.key)),
    [recommendedTabs, tabs]
  );
  const quickStartCards = useMemo<Array<{ key: ReportsTabKey; title: string; description: string }>>(
    () => [
      {
        key: "overview",
        title: t("quickStart.overviewTitle"),
        description: t("quickStart.overviewDescription"),
      },
      {
        key: "collections-followup",
        title: t("quickStart.collectionsTitle"),
        description: t("quickStart.collectionsDescription"),
      },
      {
        key: "critical-alerts",
        title: t("quickStart.alertsTitle"),
        description: t("quickStart.alertsDescription"),
      },
    ],
    [t]
  );
  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? t("title");
  const exportTargetLabel = tabs.find((tab) => tab.key === exportTarget)?.label ?? t("title");
  const exportEstimatedCount = useMemo(() => {
    if (exportTarget === "collections-followup") return collectionsQuery.data?.meta.total ?? 0;
    if (exportTarget === "debts-summary") return debtsQuery.data?.meta.total ?? 0;
    if (exportTarget === "staff-activity") return staffQuery.data?.meta.total ?? 0;
    if (exportTarget === "simple-ledger") return ledgerQuery.data?.meta.total ?? 0;
    if (exportTarget === "cash-flow") return cashFlowQuery.data?.meta.total ?? 0;
    if (exportTarget === "customers-aging") return customersAgingQuery.data?.meta.total ?? 0;
    if (exportTarget === "suppliers-aging") return suppliersAgingQuery.data?.meta.total ?? 0;
    if (exportTarget === "sales-detailed") return salesDetailedQuery.data?.meta.total ?? 0;
    if (exportTarget === "expenses-analytics") return expensesAnalyticsQuery.data?.meta.total ?? 0;
    if (exportTarget === "products-performance") return productsPerformanceQuery.data?.meta.total ?? 0;
    if (exportTarget === "ledger-statement") return ledgerStatementQuery.data?.meta.total ?? 0;
    if (exportTarget === "critical-alerts") {
      const alerts = criticalAlertsQuery.data;
      if (!alerts) return 0;
      return (
        alerts.creditLimitRisk.length +
        alerts.largeOverdues.length +
        alerts.upcomingInstallments.length
      );
    }
    if (exportTarget === "profit-loss" || exportTarget === "operational-performance") return 1;
    return 0;
  }, [
    cashFlowQuery.data?.meta.total,
    collectionsQuery.data?.meta.total,
    criticalAlertsQuery.data,
    customersAgingQuery.data?.meta.total,
    debtsQuery.data?.meta.total,
    expensesAnalyticsQuery.data?.meta.total,
    exportTarget,
    ledgerQuery.data?.meta.total,
    ledgerStatementQuery.data?.meta.total,
    productsPerformanceQuery.data?.meta.total,
    salesDetailedQuery.data?.meta.total,
    staffQuery.data?.meta.total,
    suppliersAgingQuery.data?.meta.total,
  ]);

  const tabsWithTopExport = useMemo<ReportsTabKey[]>(
    () => [
      "profit-loss",
      "cash-flow",
      "customers-aging",
      "suppliers-aging",
      "sales-detailed",
      "expenses-analytics",
      "products-performance",
      "operational-performance",
      "critical-alerts",
      "ledger-statement",
      "collections-followup",
      "debts-summary",
      "staff-activity",
      "simple-ledger",
    ],
    []
  );

  const openExportModal = (tab: ReportsTabKey) => {
    setExportTarget(tab);
    setIsExportScopeOpen(true);
  };

  const handleExport = async (scope: ExportScope) => {
    try {
      setIsExporting(true);

      if (exportTarget === "collections-followup") {
        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getCollectionsFollowup({
            ...collectionsFilters,
            page: currentPage,
            limit: pageSize,
            dateFrom: scope.dateFrom ?? collectionsFilters.dateFrom,
            dateTo: scope.dateTo ?? collectionsFilters.dateTo,
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [tCollections("table.type")]: tCollections(`type.${row.type}`),
          [tCollections("table.referenceNumber")]: row.referenceNumber,
          [tCollections("table.party")]: row.partyName,
          [tCollections("table.phone")]: row.partyPhone || "-",
          [tCollections("table.dueDate")]: formatDate(row.dueDate, locale),
          [tCollections("table.expectedAmount")]: formatMoney(row.expectedAmount, locale),
          [tCollections("table.daysUntilDue")]: row.daysUntilDue,
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.collectionsFollowup"),
          filePrefix: t("export.filePrefixCollectionsFollowup"),
        });
      }

      if (exportTarget === "debts-summary") {
        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getDebtsSummary({
            ...debtsFilters,
            page: currentPage,
            limit: pageSize,
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [tDebts("table.entityType")]: tDebts(`entityType.${row.entityType}`),
          [tDebts("table.name")]: row.name,
          [tDebts("table.phone")]: row.phone || "-",
          [tDebts("table.balanceType")]: tDebts(`balanceType.${row.balanceType}`),
          [tDebts("table.amount")]: formatMoney(row.amount, locale),
          [tDebts("table.status")]: row.isActive ? tDebts("status.active") : tDebts("status.inactive"),
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.debtsSummary"),
          filePrefix: t("export.filePrefixDebtsSummary"),
        });
      }

      if (exportTarget === "staff-activity") {
        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getStaffActivity({
            ...staffFilters,
            page: currentPage,
            limit: pageSize,
            dateFrom: scope.dateFrom ?? staffFilters.dateFrom,
            dateTo: scope.dateTo ?? staffFilters.dateTo,
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [tStaff("table.fullName")]: row.fullName,
          [tStaff("table.email")]: row.email,
          [tStaff("table.role")]: row.role,
          [tStaff("table.activitiesCount")]: row.activitiesCount,
          [tStaff("table.invoicesCount")]: row.invoicesCount,
          [tStaff("table.invoicesAmount")]: formatMoney(row.invoicesAmount, locale),
          [tStaff("table.collectionsAmount")]: formatMoney(row.collectionsAmount, locale),
          [tStaff("table.expensesAmount")]: formatMoney(row.expensesAmount, locale),
          [tStaff("table.lastActivityAt")]: formatDateTime(row.lastActivityAt, locale),
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.staffActivity"),
          filePrefix: t("export.filePrefixStaffActivity"),
        });
      }

      if (exportTarget === "simple-ledger") {
        if (!ledgerPartyId) {
          showInfo(t("messages.selectPartyForExport"));
          return;
        }

        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getSimpleLedger({
            ...ledgerFilters,
            page: currentPage,
            limit: pageSize,
            dateFrom: scope.dateFrom ?? ledgerFilters.dateFrom,
            dateTo: scope.dateTo ?? ledgerFilters.dateTo,
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [tLedger("table.date")]: formatDate(row.date, locale),
          [tLedger("table.dueDate")]: formatDate(row.dueDate, locale),
          [tLedger("table.entryType")]: row.entryType,
          [tLedger("table.note")]: row.note || "-",
          [tLedger("table.debit")]: formatMoney(row.debit, locale),
          [tLedger("table.credit")]: formatMoney(row.credit, locale),
          [tLedger("table.runningBalance")]: formatMoney(row.runningBalance, locale),
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.simpleLedger"),
          filePrefix: t("export.filePrefixSimpleLedger"),
        });
      }

      if (exportTarget === "profit-loss") {
        const data = await reportsApi.getProfitLoss({
          dateFrom: (scope.dateFrom ?? profitLossDateFrom) || undefined,
          dateTo: (scope.dateTo ?? profitLossDateTo) || undefined,
          comparePrevious: profitLossComparePrevious,
        });

        const rows = [
          {
            [t("profitLoss.summary.netSales")]: formatMoney(data.revenue.netSales, locale),
            [t("profitLoss.summary.totalExpenses")]: formatMoney(data.expenses.total, locale),
            [t("profitLoss.summary.netProfit")]: formatMoney(data.profit.netProfit, locale),
            [t("profitLoss.summary.margin")]: `${data.profit.marginPercent}%`,
          },
        ];

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.profitLoss"),
          filePrefix: t("export.filePrefixProfitLoss"),
        });
      }

      if (exportTarget === "cash-flow") {
        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getCashFlow({
            page: currentPage,
            limit: pageSize,
            dateFrom: (scope.dateFrom ?? cashFlowDateFrom) || undefined,
            dateTo: (scope.dateTo ?? cashFlowDateTo) || undefined,
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [t("cashFlow.table.date")]: formatDate(row.date, locale),
          [t("cashFlow.table.inflow")]: formatMoney(row.inflow, locale),
          [t("cashFlow.table.outflow")]: formatMoney(row.outflow, locale),
          [t("cashFlow.table.net")]: formatMoney(row.net, locale),
          [t("cashFlow.table.closingBalance")]: formatMoney(row.closingBalance, locale),
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.cashFlow"),
          filePrefix: t("export.filePrefixCashFlow"),
        });
      }

      if (exportTarget === "customers-aging") {
        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getCustomersAging({
            page: currentPage,
            limit: pageSize,
            asOfDate: customersAgingAsOfDate || undefined,
            search: debouncedCustomersAgingSearch || undefined,
            isActive: customersAgingIsActive === "all" ? undefined : customersAgingIsActive === "true",
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [t("customersAging.table.name")]: row.name,
          [t("customersAging.table.phone")]: row.phone || "-",
          [t("customersAging.table.totalOutstanding")]: formatMoney(row.totalOutstanding, locale),
          [t("customersAging.table.bucket0_30")]: formatMoney(row.bucket_0_30, locale),
          [t("customersAging.table.bucket31_60")]: formatMoney(row.bucket_31_60, locale),
          [t("customersAging.table.bucket61_90")]: formatMoney(row.bucket_61_90, locale),
          [t("customersAging.table.bucket90")]: formatMoney(row.bucket_90_plus, locale),
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.customersAging"),
          filePrefix: t("export.filePrefixCustomersAging"),
        });
      }

      if (exportTarget === "suppliers-aging") {
        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getSuppliersAging({
            page: currentPage,
            limit: pageSize,
            asOfDate: suppliersAgingAsOfDate || undefined,
            search: debouncedSuppliersAgingSearch || undefined,
            isActive: suppliersAgingIsActive === "all" ? undefined : suppliersAgingIsActive === "true",
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [t("suppliersAging.table.name")]: row.name,
          [t("suppliersAging.table.phone")]: row.phone || "-",
          [t("suppliersAging.table.totalOutstanding")]: formatMoney(row.totalOutstanding, locale),
          [t("suppliersAging.table.bucket0_30")]: formatMoney(row.bucket_0_30, locale),
          [t("suppliersAging.table.bucket31_60")]: formatMoney(row.bucket_31_60, locale),
          [t("suppliersAging.table.bucket61_90")]: formatMoney(row.bucket_61_90, locale),
          [t("suppliersAging.table.bucket90")]: formatMoney(row.bucket_90_plus, locale),
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.suppliersAging"),
          filePrefix: t("export.filePrefixSuppliersAging"),
        });
      }

      if (exportTarget === "sales-detailed") {
        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getSalesDetailed({
            page: currentPage,
            limit: pageSize,
            search: debouncedSalesSearch || undefined,
            saleType: salesType === "all" ? undefined : salesType,
            partyType: salesPartyType === "all" ? undefined : salesPartyType,
            dateFrom: (scope.dateFrom ?? salesDateFrom) || undefined,
            dateTo: (scope.dateTo ?? salesDateTo) || undefined,
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [t("salesDetailed.table.invoiceNumber")]: row.invoiceNumber,
          [t("salesDetailed.table.issueDate")]: formatDate(row.issueDate, locale),
          [t("salesDetailed.table.partyName")]: row.partyName,
          [t("salesDetailed.table.saleType")]: row.saleType,
          [t("salesDetailed.table.totalAmount")]: formatMoney(row.totalAmount, locale),
          [t("salesDetailed.table.taxAmount")]: formatMoney(row.taxAmount, locale),
          [t("salesDetailed.table.netAmount")]: formatMoney(row.netAmount, locale),
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.salesDetailed"),
          filePrefix: t("export.filePrefixSalesDetailed"),
        });
      }

      if (exportTarget === "expenses-analytics") {
        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getExpensesAnalytics({
            page: currentPage,
            limit: pageSize,
            dateFrom: scope.dateFrom ?? monthRange.from,
            dateTo: scope.dateTo ?? monthRange.to,
            comparePrevious: true,
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [t("expensesAnalytics.export.date")]: formatDate(row.expenseDate, locale),
          [t("expensesAnalytics.export.category")]: row.category,
          [t("expensesAnalytics.export.amount")]: formatMoney(row.amount, locale),
          [t("expensesAnalytics.export.supplier")]: row.supplierName || "-",
          [t("expensesAnalytics.export.description")]: row.description || "-",
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.expensesAnalytics"),
          filePrefix: t("export.filePrefixExpensesAnalytics"),
        });
      }

      if (exportTarget === "products-performance") {
        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getProductsPerformance({
            page: currentPage,
            limit: pageSize,
            dateFrom: scope.dateFrom ?? monthRange.from,
            dateTo: scope.dateTo ?? monthRange.to,
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [t("productsPerformance.table.productName")]: row.productName,
          [t("productsPerformance.table.sku")]: row.sku || "-",
          [t("productsPerformance.table.category")]: row.category || "-",
          [t("productsPerformance.table.quantitySold")]: row.quantitySold,
          [t("productsPerformance.table.salesAmount")]: formatMoney(row.salesAmount, locale),
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.productsPerformance"),
          filePrefix: t("export.filePrefixProductsPerformance"),
        });
      }

      if (exportTarget === "operational-performance") {
        const data = await reportsApi.getOperationalPerformance({
          dateFrom: scope.dateFrom ?? monthRange.from,
          dateTo: scope.dateTo ?? monthRange.to,
          comparePrevious: true,
        });

        const rows = [
          {
            [t("operationalPerformance.summary.revenue")]: formatMoney(data.sales.revenue, locale),
            [t("operationalPerformance.summary.avgInvoiceValue")]: formatMoney(data.sales.avgInvoiceValue, locale),
            [t("operationalPerformance.summary.expensesTotal")]: formatMoney(data.expenses.total, locale),
            [t("operationalPerformance.summary.collectionRate")]: `${data.collections.collectionRatePercent}%`,
          },
        ];

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.operationalPerformance"),
          filePrefix: t("export.filePrefixOperationalPerformance"),
        });
      }

      if (exportTarget === "critical-alerts") {
        const data = await reportsApi.getCriticalAlerts({
          asOfDate: scope.dateTo ?? monthRange.to,
          creditUsageThresholdPercent: 80,
          largeOverdueAmount: 5000,
          upcomingInstallmentsDays: 7,
          limit: scope.maxRecords ?? 100,
        });

        const rows = [
          ...data.creditLimitRisk.map((row) => ({
            [t("criticalAlerts.export.type")]: t("criticalAlerts.export.typeCreditRisk"),
            [t("criticalAlerts.export.name")]: row.name,
            [t("criticalAlerts.export.value")]: `${row.usagePercent}%`,
            [t("criticalAlerts.export.amount")]: formatMoney(row.balance, locale),
          })),
          ...data.largeOverdues.map((row) => ({
            [t("criticalAlerts.export.type")]: t("criticalAlerts.export.typeLargeOverdue"),
            [t("criticalAlerts.export.name")]: row.partyName,
            [t("criticalAlerts.export.value")]: row.referenceNumber,
            [t("criticalAlerts.export.amount")]: formatMoney(row.outstandingAmount, locale),
          })),
          ...data.upcomingInstallments.map((row) => ({
            [t("criticalAlerts.export.type")]: t("criticalAlerts.export.typeUpcomingInstallment"),
            [t("criticalAlerts.export.name")]: row.partyName,
            [t("criticalAlerts.export.value")]: row.contractNumber,
            [t("criticalAlerts.export.amount")]: formatMoney(row.remainingAmount, locale),
          })),
        ];

        if (rows.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.criticalAlerts"),
          filePrefix: t("export.filePrefixCriticalAlerts"),
        });
      }

      if (exportTarget === "ledger-statement") {
        if (!ledgerReportPartyId) {
          showInfo(t("messages.selectPartyForExport"));
          return;
        }

        const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
          reportsApi.getLedgerStatement({
            page: currentPage,
            limit: pageSize,
            partyType: ledgerReportPartyType,
            partyId: ledgerReportPartyId,
            dateFrom: scope.dateFrom ?? monthRange.from,
            dateTo: scope.dateTo ?? monthRange.to,
          }),
          { maxItems: scope.maxRecords }
        );

        if (allItems.length === 0) {
          showInfo(t("messages.exportEmpty"));
          return;
        }

        const rows = allItems.map((row) => ({
          [t("ledgerStatement.table.date")]: formatDate(row.date, locale),
          [t("ledgerStatement.table.entryType")]: row.entryType,
          [t("ledgerStatement.table.debit")]: formatMoney(row.debit, locale),
          [t("ledgerStatement.table.credit")]: formatMoney(row.credit, locale),
          [t("ledgerStatement.table.runningBalance")]: formatMoney(row.runningBalance, locale),
          [t("ledgerStatement.table.note")]: row.note || "-",
        }));

        await exportRowsToExcel(rows, {
          locale,
          sheetName: t("tabs.ledgerStatement"),
          filePrefix: t("export.filePrefixLedgerStatement"),
        });
      }

      showSuccess(t("messages.exportSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  const exportInitialScope = useMemo(() => {
    if (exportTarget === "collections-followup") {
      return { dateFrom: collectionsDateFrom, dateTo: collectionsDateTo };
    }
    if (exportTarget === "staff-activity") {
      return { dateFrom: staffDateFrom, dateTo: staffDateTo };
    }
    if (exportTarget === "simple-ledger") {
      return { dateFrom: ledgerDateFrom || undefined, dateTo: ledgerDateTo || undefined };
    }
    if (exportTarget === "profit-loss") {
      return { dateFrom: profitLossDateFrom, dateTo: profitLossDateTo };
    }
    if (exportTarget === "cash-flow") {
      return { dateFrom: cashFlowDateFrom, dateTo: cashFlowDateTo };
    }
    if (exportTarget === "sales-detailed") {
      return { dateFrom: salesDateFrom, dateTo: salesDateTo };
    }
    return {};
  }, [
    cashFlowDateFrom,
    cashFlowDateTo,
    collectionsDateFrom,
    collectionsDateTo,
    exportTarget,
    ledgerDateFrom,
    ledgerDateTo,
    profitLossDateFrom,
    profitLossDateTo,
    salesDateFrom,
    salesDateTo,
    staffDateFrom,
    staffDateTo,
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {quickStartCards.map((card) => {
            const isActive = activeTab === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveTab(card.key)}
                className={`rounded-2xl border p-4 text-start transition ${
                  isActive
                    ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : "border-gray-200 bg-gray-50/70 hover:border-brand-200 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-brand-700/60"
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{card.title}</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{card.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            {t("groups.recommended")}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5">
            {tabs.filter((tab) => recommendedTabs.includes(tab.key)).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            {t("groups.moreReports")}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5">
            {secondaryTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/70 dark:text-gray-300">
          <span className="font-medium text-gray-900 dark:text-white">{activeTabLabel}</span>
          <span className="mx-2 text-gray-400">•</span>
          {recommendedTabs.includes(activeTab) ? t("groups.recommendedHint") : t("groups.moreReportsHint")}
        </div>
        {canExport && tabsWithTopExport.includes(activeTab) && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => openExportModal(activeTab)}
              disabled={isExporting}
              className="rounded-xl border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
            >
              {isExporting
                ? t("collectionsFollowup.actions.exporting")
                : `${t("exportModal.confirm")} (${activeTabLabel})`}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-700/40 dark:bg-amber-900/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-200">
              {t("operationalCash.badge")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">
              {t("operationalCash.title")}
            </h2>
            <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">
              {t("operationalCash.subtitle")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-300">{t("operationalCash.totalRecords")}</p>
            <p className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">
              {operationalCashSummaryQuery.data?.totals.totalRecords ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-300">{t("operationalCash.closedDays")}</p>
            <p className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">
              {operationalCashSummaryQuery.data?.totals.closedCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-300">{t("operationalCash.openDrafts")}</p>
            <p className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">
              {operationalCashSummaryQuery.data?.totals.draftCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-300">{t("operationalCash.totalVariance")}</p>
            <p className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">
              {operationalCashSummaryQuery.data?.totals.totalVariance ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-amber-200 dark:border-amber-700/40">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-amber-100/60 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
              <tr>
                <th className="px-3 py-2 text-start">{t("operationalCash.columns.businessDate")}</th>
                <th className="px-3 py-2 text-start">{t("operationalCash.columns.expectedCash")}</th>
                <th className="px-3 py-2 text-start">{t("operationalCash.columns.actualCash")}</th>
                <th className="px-3 py-2 text-start">{t("operationalCash.columns.variance")}</th>
                <th className="px-3 py-2 text-start">{t("operationalCash.columns.closedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {(operationalCashHistoryQuery.data?.items ?? []).map((row) => (
                <tr key={row.id} className="border-t border-amber-200 dark:border-amber-700/40">
                  <td className="px-3 py-2">{row.businessDate.slice(0, 10)}</td>
                  <td className="px-3 py-2">{row.expectedCash}</td>
                  <td className="px-3 py-2">{row.actualCashCounted}</td>
                  <td className="px-3 py-2">{row.variance}</td>
                  <td className="px-3 py-2">
                    {row.closedAt ? new Date(row.closedAt).toLocaleDateString(locale) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {activeTab === "overview" && (
        <ReportsOverviewSection
          summary={overviewQuery.data ?? { totalReceivables: "0.00", deferredSales: { total: 0, totalAmount: "0.00", paidAmount: "0.00", remainingAmount: "0.00", overdueCount: 0, overdueAmount: "0.00" }, installments: { activeContracts: 0, totalAmount: "0.00", paidAmount: "0.00", remainingAmount: "0.00", overdueSchedules: 0, overdueAmount: "0.00" } }}
          loading={overviewQuery.isLoading || overviewQuery.isFetching}
          filters={{ partyType: overviewPartyType, dateFrom: overviewDateFrom, dateTo: overviewDateTo }}
          onPartyTypeChange={setOverviewPartyType}
          onDateFromChange={setOverviewDateFrom}
          onDateToChange={setOverviewDateTo}
          onOpenCollectionsFollowup={() => setActiveTab("collections-followup")}
          onOpenDebtsSummary={() => setActiveTab("debts-summary")}
          onOpenStaffActivity={() => setActiveTab("staff-activity")}
          onCollectionBreakdownDrilldown={() => setActiveTab("collections-followup")}
          onOverdueDistributionDrilldown={() => setActiveTab("collections-followup")}
        />
      )}

      {activeTab === "profit-loss" && (
        <ProfitLossSection
          data={profitLossQuery.data ?? { period: { dateFrom: "", dateTo: "", days: 0 }, revenue: { invoicesCount: 0, grossSales: "0.00", taxAmount: "0.00", netSales: "0.00", byPartyType: [] }, expenses: { expensesCount: 0, total: "0.00", byCategory: [] }, profit: { grossProfit: "0.00", netProfit: "0.00", marginPercent: "0.00" }, comparison: null }}
          loading={profitLossQuery.isLoading || profitLossQuery.isFetching}
          filters={{ dateFrom: profitLossDateFrom, dateTo: profitLossDateTo, comparePrevious: profitLossComparePrevious }}
          onDateFromChange={setProfitLossDateFrom}
          onDateToChange={setProfitLossDateTo}
          onComparePreviousChange={setProfitLossComparePrevious}
        />
      )}

      {activeTab === "cash-flow" && (
        <CashFlowSection
          items={cashFlowQuery.data?.items ?? []}
          totals={cashFlowQuery.data?.totals ?? { openingBalance: "0.00", inflow: "0.00", outflow: "0.00", netChange: "0.00", closingBalance: "0.00" }}
          meta={cashFlowQuery.data?.meta ?? DEFAULT_REPORTS_META}
          loading={cashFlowQuery.isLoading || cashFlowQuery.isFetching}
          error={cashFlowQuery.error?.message}
          filters={{ dateFrom: cashFlowDateFrom, dateTo: cashFlowDateTo, limit: cashFlowLimit }}
          onDateFromChange={setCashFlowDateFrom}
          onDateToChange={setCashFlowDateTo}
          onLimitChange={setCashFlowLimit}
          onPageChange={setCashFlowPage}
        />
      )}

      {activeTab === "customers-aging" && (
        <AgingSection
          namespace="customersAging"
          items={customersAgingQuery.data?.items ?? []}
          summary={customersAgingQuery.data?.summary ?? { partiesCount: 0, totalOutstanding: "0.00", bucket_0_30: "0.00", bucket_31_60: "0.00", bucket_61_90: "0.00", bucket_90_plus: "0.00" }}
          meta={customersAgingQuery.data?.meta ?? DEFAULT_REPORTS_META}
          loading={customersAgingQuery.isLoading || customersAgingQuery.isFetching}
          error={customersAgingQuery.error?.message}
          filters={{ search: customersAgingSearch, asOfDate: customersAgingAsOfDate, isActive: customersAgingIsActive, limit: customersAgingLimit }}
          onSearchChange={setCustomersAgingSearch}
          onAsOfDateChange={setCustomersAgingAsOfDate}
          onIsActiveChange={setCustomersAgingIsActive}
          onLimitChange={setCustomersAgingLimit}
          onPageChange={setCustomersAgingPage}
        />
      )}

      {activeTab === "suppliers-aging" && (
        <AgingSection
          namespace="suppliersAging"
          items={suppliersAgingQuery.data?.items ?? []}
          summary={suppliersAgingQuery.data?.summary ?? { partiesCount: 0, totalOutstanding: "0.00", bucket_0_30: "0.00", bucket_31_60: "0.00", bucket_61_90: "0.00", bucket_90_plus: "0.00" }}
          meta={suppliersAgingQuery.data?.meta ?? DEFAULT_REPORTS_META}
          loading={suppliersAgingQuery.isLoading || suppliersAgingQuery.isFetching}
          error={suppliersAgingQuery.error?.message}
          filters={{ search: suppliersAgingSearch, asOfDate: suppliersAgingAsOfDate, isActive: suppliersAgingIsActive, limit: suppliersAgingLimit }}
          onSearchChange={setSuppliersAgingSearch}
          onAsOfDateChange={setSuppliersAgingAsOfDate}
          onIsActiveChange={setSuppliersAgingIsActive}
          onLimitChange={setSuppliersAgingLimit}
          onPageChange={setSuppliersAgingPage}
        />
      )}

      {activeTab === "sales-detailed" && (
        <SalesDetailedSection
          items={salesDetailedQuery.data?.items ?? []}
          summary={salesDetailedQuery.data?.summary ?? { invoicesCount: 0, grossAmount: "0.00", taxAmount: "0.00", netAmount: "0.00" }}
          meta={salesDetailedQuery.data?.meta ?? DEFAULT_REPORTS_META}
          loading={salesDetailedQuery.isLoading || salesDetailedQuery.isFetching}
          error={salesDetailedQuery.error?.message}
          filters={{ search: salesSearch, saleType: salesType, partyType: salesPartyType, dateFrom: salesDateFrom, dateTo: salesDateTo, limit: salesLimit }}
          onSearchChange={setSalesSearch}
          onSaleTypeChange={setSalesType}
          onPartyTypeChange={setSalesPartyType}
          onDateFromChange={setSalesDateFrom}
          onDateToChange={setSalesDateTo}
          onLimitChange={setSalesLimit}
          onPageChange={setSalesPage}
        />
      )}

      {activeTab === "expenses-analytics" && <ExpensesAnalyticsSection data={expensesAnalyticsQuery.data ?? { period: { dateFrom: "", dateTo: "", days: 0 }, summary: { totalAmount: "0.00", expensesCount: 0, averageExpense: "0.00" }, byCategory: [], comparison: null, items: [], meta: DEFAULT_REPORTS_META }} loading={expensesAnalyticsQuery.isLoading || expensesAnalyticsQuery.isFetching} />}

      {activeTab === "products-performance" && <ProductsPerformanceSection data={productsPerformanceQuery.data ?? { summary: { totalProducts: 0, totalQuantity: "0.000", totalSalesAmount: "0.00" }, items: [], meta: DEFAULT_REPORTS_META }} loading={productsPerformanceQuery.isLoading || productsPerformanceQuery.isFetching} />}

      {activeTab === "operational-performance" && <OperationalPerformanceSection data={operationalPerformanceQuery.data ?? { period: { dateFrom: "", dateTo: "", days: 0 }, sales: { invoicesCount: 0, revenue: "0.00", avgInvoiceValue: "0.00", growthPercent: null }, expenses: { total: "0.00", growthPercent: null }, quality: { cancelledInvoicesCount: 0, cancellationRatePercent: "0.00" }, collections: { expected: "0.00", actual: "0.00", collectionRatePercent: "0.00" } }} loading={operationalPerformanceQuery.isLoading || operationalPerformanceQuery.isFetching} />}

      {activeTab === "critical-alerts" && <CriticalAlertsSection data={criticalAlertsQuery.data ?? { asOfDate: "", creditLimitRisk: [], largeOverdues: [], expensesSpike: { current: "0.00", previous: "0.00", growthPercent: null, isAlert: false }, upcomingInstallments: [] }} loading={criticalAlertsQuery.isLoading || criticalAlertsQuery.isFetching} />}

      {activeTab === "ledger-statement" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <select
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={ledgerReportPartyType}
                onChange={(event) => {
                  setLedgerReportPartyType(event.target.value as PartyType);
                  setLedgerReportPartyId(undefined);
                }}
              >
                <option value="CUSTOMER">{t("partyType.customer")}</option>
                <option value="SUPPLIER">{t("partyType.supplier")}</option>
                <option value="EMPLOYEE">{t("partyType.employee")}</option>
              </select>
              <input
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={ledgerReportPartySearch}
                onChange={(event) => setLedgerReportPartySearch(event.target.value)}
                placeholder={t("ledgerStatement.filters.partySearch")}
              />
              <select
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={ledgerReportPartyId ?? ""}
                onChange={(event) => setLedgerReportPartyId(event.target.value || undefined)}
              >
                <option value="">{t("ledgerStatement.filters.party")}</option>
                {ledgerReportPartyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </section>
          <LedgerStatementReportSection
            data={ledgerStatementQuery.data ?? { party: null, openingBalance: "0.00", totalDebit: "0.00", totalCredit: "0.00", closingBalance: "0.00", currentBalance: "0.00", items: [], meta: DEFAULT_REPORTS_META }}
            loading={ledgerStatementQuery.isLoading || ledgerStatementQuery.isFetching}
          />
        </div>
      )}

      {activeTab === "collections-followup" && (
        <CollectionsFollowupSection
          items={collectionsQuery.data?.items ?? []}
          summary={collectionsQuery.data?.summary ?? { expectedAmount: "0.00", collectedAmount: "0.00", collectionRatePercent: "0.00", overdueOutstanding: "0.00" }}
          meta={collectionsQuery.data?.meta ?? DEFAULT_REPORTS_META}
          loading={collectionsQuery.isLoading || collectionsQuery.isFetching}
          error={collectionsQuery.error?.message}
          filters={{ partyType: collectionsPartyType, partyId: collectionsPartyId, dateFrom: collectionsDateFrom, dateTo: collectionsDateTo, limit: collectionsLimit }}
          partyOptions={collectionsPartyOptions}
          partyLoading={customersQuery.isLoading || suppliersQuery.isLoading || employeesQuery.isLoading}
          canExport={false}
          isExporting={false}
          onPartyTypeChange={setCollectionsPartyType}
          onPartyIdChange={setCollectionsPartyId}
          onPartySearchChange={setCollectionsPartySearch}
          onDateFromChange={setCollectionsDateFrom}
          onDateToChange={setCollectionsDateTo}
          onLimitChange={setCollectionsLimit}
          onPageChange={setCollectionsPage}
          onExportClick={() => undefined}
        />
      )}

      {activeTab === "debts-summary" && (
        <DebtsSummarySection
          items={debtsQuery.data?.items ?? []}
          totals={debtsQuery.data?.totals ?? { customersReceivable: "0.00", customersCredit: "0.00", suppliersReceivable: "0.00", suppliersPayable: "0.00", netReceivable: "0.00" }}
          meta={debtsQuery.data?.meta ?? DEFAULT_REPORTS_META}
          loading={debtsQuery.isLoading || debtsQuery.isFetching}
          error={debtsQuery.error?.message}
          filters={{ search: debtsSearch, entityType: debtsEntityType, balanceType: debtsBalanceType, isActive: debtsIsActive, minAmount: debtsMinAmount, limit: debtsLimit }}
          canExport={false}
          isExporting={false}
          onSearchChange={setDebtsSearch}
          onEntityTypeChange={setDebtsEntityType}
          onBalanceTypeChange={setDebtsBalanceType}
          onIsActiveChange={setDebtsIsActive}
          onMinAmountChange={setDebtsMinAmount}
          onLimitChange={setDebtsLimit}
          onPageChange={setDebtsPage}
          onExportClick={() => undefined}
        />
      )}

      {activeTab === "staff-activity" && (
        <StaffActivitySection
          items={staffQuery.data?.items ?? []}
          summary={staffQuery.data?.summary ?? { usersCount: 0, totalActivities: 0, totalInvoices: 0, totalInvoiceAmount: "0.00", totalCollections: "0.00", totalExpenses: "0.00" }}
          meta={staffQuery.data?.meta ?? DEFAULT_REPORTS_META}
          loading={staffQuery.isLoading || staffQuery.isFetching}
          error={staffQuery.error?.message}
          filters={{ search: staffSearch, userId: staffUserId, dateFrom: staffDateFrom, dateTo: staffDateTo, limit: staffLimit }}
          userOptions={staffUserOptions}
          userLoading={usersQuery.isLoading}
          canExport={false}
          isExporting={false}
          onSearchChange={setStaffSearch}
          onUserChange={setStaffUserId}
          onUserSearchChange={setStaffUserSearch}
          onDateFromChange={setStaffDateFrom}
          onDateToChange={setStaffDateTo}
          onLimitChange={setStaffLimit}
          onPageChange={setStaffPage}
          onExportClick={() => undefined}
        />
      )}

      {activeTab === "simple-ledger" && (
        <SimpleLedgerSection
          items={ledgerQuery.data?.items ?? []}
          balances={{ openingBalance: ledgerQuery.data?.openingBalance ?? "0.00", totalDebit: ledgerQuery.data?.totalDebit ?? "0.00", totalCredit: ledgerQuery.data?.totalCredit ?? "0.00", closingBalance: ledgerQuery.data?.closingBalance ?? "0.00", currentBalance: ledgerQuery.data?.currentBalance ?? "0.00" }}
          meta={ledgerQuery.data?.meta ?? DEFAULT_REPORTS_META}
          loading={ledgerQuery.isLoading || ledgerQuery.isFetching}
          error={ledgerQuery.error?.message}
          filters={{ partyType: ledgerPartyType, partyId: ledgerPartyId, dateFrom: ledgerDateFrom, dateTo: ledgerDateTo, limit: ledgerLimit }}
          partyOptions={simpleLedgerPartyOptions}
          partyLoading={customersQuery.isLoading || suppliersQuery.isLoading || employeesQuery.isLoading}
          canExport={false}
          isExporting={false}
          onPartyTypeChange={setLedgerPartyType}
          onPartyIdChange={setLedgerPartyId}
          onPartySearchChange={setLedgerPartySearch}
          onDateFromChange={setLedgerDateFrom}
          onDateToChange={setLedgerDateTo}
          onLimitChange={setLedgerLimit}
          onPageChange={setLedgerPage}
          onExportClick={() => undefined}
        />
      )}

      <ExportScopeModal
        open={isExportScopeOpen}
        loading={isExporting}
        initialScope={exportInitialScope}
        labels={{
          title: `${t("exportModal.title")} (${exportTargetLabel})`,
          description: `${t("exportModal.description")} - ${exportTargetLabel}. ${t("messages.estimatedRecords", { count: exportEstimatedCount })}`,
          fromDate: t("exportModal.fromDate"),
          toDate: t("exportModal.toDate"),
          maxRecords: t("exportModal.maxRecords"),
          maxRecordsHint: t("exportModal.maxRecordsHint"),
          reset: t("exportModal.reset"),
          cancel: t("exportModal.cancel"),
          confirm: t("exportModal.confirm"),
        }}
        onClose={() => setIsExportScopeOpen(false)}
        onConfirm={(scope) => {
          setIsExportScopeOpen(false);
          void handleExport(scope);
        }}
      />
    </div>
  );
}


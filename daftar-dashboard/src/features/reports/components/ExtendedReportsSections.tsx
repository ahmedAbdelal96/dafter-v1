"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import DatePicker from "@/components/form/date-picker";
import Input from "@/components/form/input/InputField";
import { FinancialAmount } from "@/components/common/FinancialAmount";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import Badge from "@/components/ui/badge/Badge";
import { DataTable } from "@/components/ui/data-table";
import type {
  AgingItem,
  AgingSummary,
  CashFlowDayItem,
  CriticalAlertsResponse,
  ExpensesAnalyticsResponse,
  OperationalPerformanceResponse,
  PartyType,
  ProductsPerformanceResponse,
  ProfitLossResponse,
  ReportsLedgerStatementResponse,
  ReportsMeta,
  ReportSaleType,
  SalesDetailedItem,
} from "@/lib/api/types";
import { formatDate, formatMoney } from "../utils/reports-format";

const sectionCardClassName =
  "rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90 dark:shadow-black/20";

function SummaryCard({
  title,
  value,
  amount,
}: {
  title: string;
  value: string;
  amount?: string | number | null;
}) {
  return (
    <div className="rounded-3xl border border-border-light/90 bg-white/94 p-4 shadow-sm shadow-slate-200/60 backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90 dark:shadow-black/20">
      <p className="text-sm text-text-secondary dark:text-slate-300">{title}</p>
      <div className="mt-2">
        {amount === undefined ? (
          <p className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
        ) : (
          <FinancialAmount amount={amount} formatted={value} variant="card" className="text-lg" />
        )}
      </div>
    </div>
  );
}

export function ProfitLossSection({
  data,
  loading,
  filters,
  onDateFromChange,
  onDateToChange,
  onComparePreviousChange,
}: {
  data: ProfitLossResponse;
  loading: boolean;
  filters: { dateFrom: string; dateTo: string; comparePrevious: boolean };
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onComparePreviousChange: (value: boolean) => void;
}) {
  const t = useTranslations("reports.profitLoss");
  const locale = useLocale();

  return (
    <section className="space-y-4">
      <div className={sectionCardClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitle")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <DatePicker
            id="reports-pl-date-from"
            placeholder={t("filters.dateFrom")}
            defaultDate={filters.dateFrom || undefined}
            onChange={(_, dateStr) => onDateFromChange(dateStr || "")}
            options={{ allowInput: true }}
          />
          <DatePicker
            id="reports-pl-date-to"
            placeholder={t("filters.dateTo")}
            defaultDate={filters.dateTo || undefined}
            onChange={(_, dateStr) => onDateToChange(dateStr || "")}
            options={{ allowInput: true }}
          />
          <label className="flex items-center gap-2 rounded-2xl border border-border-light/80 bg-slate-50/80 px-3 py-2 text-sm text-slate-700 dark:border-white/8 dark:bg-white/[0.03] dark:text-slate-200">
            <input
              type="checkbox"
              checked={filters.comparePrevious}
              onChange={(e) => onComparePreviousChange(e.target.checked)}
            />
            <span>{t("filters.comparePrevious")}</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title={t("summary.netSales")}
          value={loading ? "..." : formatMoney(data.revenue.netSales, locale)}
          amount={loading ? undefined : data.revenue.netSales}
        />
        <SummaryCard
          title={t("summary.totalExpenses")}
          value={loading ? "..." : formatMoney(data.expenses.total, locale)}
          amount={loading ? undefined : `-${data.expenses.total}`}
        />
        <SummaryCard
          title={t("summary.netProfit")}
          value={loading ? "..." : formatMoney(data.profit.netProfit, locale)}
          amount={loading ? undefined : data.profit.netProfit}
        />
        <SummaryCard title={t("summary.margin")} value={loading ? "..." : `${data.profit.marginPercent}%`} />
      </div>
    </section>
  );
}

export function CashFlowSection({
  items,
  totals,
  meta,
  loading,
  error,
  filters,
  onDateFromChange,
  onDateToChange,
  onLimitChange,
  onPageChange,
}: {
  items: CashFlowDayItem[];
  totals: {
    openingBalance: string;
    inflow: string;
    outflow: string;
    netChange: string;
    closingBalance: string;
  };
  meta: ReportsMeta;
  loading: boolean;
  error?: string;
  filters: { dateFrom: string; dateTo: string; limit: number };
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onPageChange: (value: number) => void;
}) {
  const t = useTranslations("reports.cashFlow");
  const locale = useLocale();
  const limitOptions = useMemo<ComboboxOption[]>(
    () => [10, 20, 50, 100].map((value) => ({ value: String(value), label: String(value) })),
    []
  );

  const columns = useMemo(
    () => [
      { id: "date", header: t("table.date"), accessor: (row: CashFlowDayItem) => formatDate(row.date, locale) },
      {
        id: "inflow",
        header: t("table.inflow"),
        accessor: (row: CashFlowDayItem) => formatMoney(row.inflow, locale),
        cell: (row: CashFlowDayItem) => (
          <FinancialAmount amount={row.inflow} formatted={formatMoney(row.inflow, locale)} variant="table" zeroNeutral={false} />
        ),
      },
      {
        id: "outflow",
        header: t("table.outflow"),
        accessor: (row: CashFlowDayItem) => formatMoney(row.outflow, locale),
        cell: (row: CashFlowDayItem) => (
          <FinancialAmount amount={`-${row.outflow}`} formatted={formatMoney(row.outflow, locale)} variant="table" zeroNeutral={false} />
        ),
      },
      {
        id: "net",
        header: t("table.net"),
        accessor: (row: CashFlowDayItem) => formatMoney(row.net, locale),
        cell: (row: CashFlowDayItem) => (
          <FinancialAmount amount={row.net} formatted={formatMoney(row.net, locale)} variant="table" />
        ),
      },
      {
        id: "closingBalance",
        header: t("table.closingBalance"),
        accessor: (row: CashFlowDayItem) => formatMoney(row.closingBalance, locale),
        cell: (row: CashFlowDayItem) => (
          <FinancialAmount
            amount={row.closingBalance}
            formatted={formatMoney(row.closingBalance, locale)}
            variant="table"
          />
        ),
      },
    ],
    [locale, t]
  );

  return (
    <section className="space-y-4">
      <div className={sectionCardClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitle")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <DatePicker
            id="reports-cf-date-from"
            placeholder={t("filters.dateFrom")}
            defaultDate={filters.dateFrom || undefined}
            onChange={(_, dateStr) => onDateFromChange(dateStr || "")}
            options={{ allowInput: true }}
          />
          <DatePicker
            id="reports-cf-date-to"
            placeholder={t("filters.dateTo")}
            defaultDate={filters.dateTo || undefined}
            onChange={(_, dateStr) => onDateToChange(dateStr || "")}
            options={{ allowInput: true }}
          />
          <Combobox
            value={String(filters.limit)}
            options={limitOptions}
            searchable={false}
            placeholder={String(filters.limit)}
            searchPlaceholder={t("filters.limit")}
            onChange={(value) => onLimitChange(Number(value ?? 10))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title={t("summary.openingBalance")} value={formatMoney(totals.openingBalance, locale)} amount={totals.openingBalance} />
        <SummaryCard title={t("summary.inflow")} value={formatMoney(totals.inflow, locale)} amount={totals.inflow} />
        <SummaryCard title={t("summary.outflow")} value={formatMoney(totals.outflow, locale)} amount={`-${totals.outflow}`} />
        <SummaryCard title={t("summary.netChange")} value={formatMoney(totals.netChange, locale)} amount={totals.netChange} />
        <SummaryCard title={t("summary.closingBalance")} value={formatMoney(totals.closingBalance, locale)} amount={totals.closingBalance} />
      </div>

      <DataTable<CashFlowDayItem>
        data={items}
        columns={columns}
        loading={loading}
        error={error}
        getRowId={(row) => row.date}
        pagination={{
          page: meta.page,
          limit: meta.limit,
          total: meta.total,
          totalPages: meta.totalPages,
          hasNextPage: meta.hasNext,
          hasPrevPage: meta.hasPrev,
        }}
        onPageChange={onPageChange}
        ariaLabel={t("table.ariaLabel")}
      />
    </section>
  );
}

export function AgingSection({
  namespace,
  items,
  summary,
  meta,
  loading,
  error,
  filters,
  onSearchChange,
  onAsOfDateChange,
  onIsActiveChange,
  onLimitChange,
  onPageChange,
}: {
  namespace: "customersAging" | "suppliersAging";
  items: AgingItem[];
  summary: AgingSummary;
  meta: ReportsMeta;
  loading: boolean;
  error?: string;
  filters: { search: string; asOfDate: string; isActive: "all" | "true" | "false"; limit: number };
  onSearchChange: (value: string) => void;
  onAsOfDateChange: (value: string) => void;
  onIsActiveChange: (value: "all" | "true" | "false") => void;
  onLimitChange: (value: number) => void;
  onPageChange: (value: number) => void;
}) {
  const t = useTranslations(`reports.${namespace}`);
  const locale = useLocale();
  const limitOptions = useMemo<ComboboxOption[]>(
    () => [10, 20, 50, 100].map((value) => ({ value: String(value), label: String(value) })),
    []
  );
  const statusOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.isActiveAll") },
      { value: "true", label: t("filters.isActiveTrue") },
      { value: "false", label: t("filters.isActiveFalse") },
    ],
    [t]
  );

  const columns = useMemo(
    () => [
      { id: "name", header: t("table.name"), accessor: (row: AgingItem) => row.name },
      { id: "phone", header: t("table.phone"), accessor: (row: AgingItem) => row.phone || "-" },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row: AgingItem) => row.isActive,
        cell: (row: AgingItem) => (
          <Badge color={row.isActive ? "success" : "warning"}>
            {row.isActive ? t("status.active") : t("status.inactive")}
          </Badge>
        ),
      },
      {
        id: "totalOutstanding",
        header: t("table.totalOutstanding"),
        accessor: (row: AgingItem) => formatMoney(row.totalOutstanding, locale),
        cell: (row: AgingItem) => (
          <FinancialAmount amount={row.totalOutstanding} formatted={formatMoney(row.totalOutstanding, locale)} variant="table" />
        ),
      },
      {
        id: "bucket0_30",
        header: t("table.bucket0_30"),
        accessor: (row: AgingItem) => formatMoney(row.bucket_0_30, locale),
        cell: (row: AgingItem) => (
          <FinancialAmount amount={row.bucket_0_30} formatted={formatMoney(row.bucket_0_30, locale)} variant="table" />
        ),
      },
      {
        id: "bucket31_60",
        header: t("table.bucket31_60"),
        accessor: (row: AgingItem) => formatMoney(row.bucket_31_60, locale),
        cell: (row: AgingItem) => (
          <FinancialAmount amount={row.bucket_31_60} formatted={formatMoney(row.bucket_31_60, locale)} variant="table" />
        ),
      },
      {
        id: "bucket61_90",
        header: t("table.bucket61_90"),
        accessor: (row: AgingItem) => formatMoney(row.bucket_61_90, locale),
        cell: (row: AgingItem) => (
          <FinancialAmount amount={row.bucket_61_90} formatted={formatMoney(row.bucket_61_90, locale)} variant="table" />
        ),
      },
      {
        id: "bucket90",
        header: t("table.bucket90"),
        accessor: (row: AgingItem) => formatMoney(row.bucket_90_plus, locale),
        cell: (row: AgingItem) => (
          <FinancialAmount amount={row.bucket_90_plus} formatted={formatMoney(row.bucket_90_plus, locale)} variant="table" />
        ),
      },
      { id: "oldestDueDate", header: t("table.oldestDueDate"), accessor: (row: AgingItem) => formatDate(row.oldestDueDate, locale) },
      { id: "lastTransactionDate", header: t("table.lastTransactionDate"), accessor: (row: AgingItem) => formatDate(row.lastTransactionDate, locale) },
    ],
    [locale, t]
  );

  return (
    <section className="space-y-4">
      <div className={sectionCardClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitle")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input value={filters.search} onChange={(e) => onSearchChange(e.target.value)} placeholder={t("filters.search")} />
          <DatePicker
            id={`reports-aging-${namespace}`}
            placeholder={t("filters.asOfDate")}
            defaultDate={filters.asOfDate || undefined}
            onChange={(_, dateStr) => onAsOfDateChange(dateStr || "")}
            options={{ allowInput: true }}
          />
          <Combobox
            value={filters.isActive}
            options={statusOptions}
            searchable={false}
            placeholder={t("filters.isActive")}
            searchPlaceholder={t("filters.isActive")}
            onChange={(value) => onIsActiveChange((value as "all" | "true" | "false" | undefined) ?? "all")}
          />
          <Combobox
            value={String(filters.limit)}
            options={limitOptions}
            searchable={false}
            placeholder={String(filters.limit)}
            searchPlaceholder={t("filters.limit")}
            onChange={(value) => onLimitChange(Number(value ?? 10))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title={t("summary.partiesCount")} value={String(summary.partiesCount)} />
        <SummaryCard title={t("summary.totalOutstanding")} value={formatMoney(summary.totalOutstanding, locale)} amount={summary.totalOutstanding} />
        <SummaryCard title={t("summary.bucket0_30")} value={formatMoney(summary.bucket_0_30, locale)} amount={summary.bucket_0_30} />
        <SummaryCard title={t("summary.bucket90")} value={formatMoney(summary.bucket_90_plus, locale)} amount={summary.bucket_90_plus} />
      </div>

      <DataTable<AgingItem>
        data={items}
        columns={columns}
        loading={loading}
        error={error}
        getRowId={(row) => row.partyId}
        pagination={{
          page: meta.page,
          limit: meta.limit,
          total: meta.total,
          totalPages: meta.totalPages,
          hasNextPage: meta.hasNext,
          hasPrevPage: meta.hasPrev,
        }}
        onPageChange={onPageChange}
        ariaLabel={t("table.ariaLabel")}
      />
    </section>
  );
}

export function SalesDetailedSection({
  items,
  summary,
  meta,
  loading,
  error,
  filters,
  onSearchChange,
  onSaleTypeChange,
  onPartyTypeChange,
  onDateFromChange,
  onDateToChange,
  onLimitChange,
  onPageChange,
}: {
  items: SalesDetailedItem[];
  summary: { invoicesCount: number; grossAmount: string; taxAmount: string; netAmount: string };
  meta: ReportsMeta;
  loading: boolean;
  error?: string;
  filters: {
    search: string;
    saleType: "all" | ReportSaleType;
    partyType: "all" | PartyType;
    dateFrom: string;
    dateTo: string;
    limit: number;
  };
  onSearchChange: (value: string) => void;
  onSaleTypeChange: (value: "all" | ReportSaleType) => void;
  onPartyTypeChange: (value: "all" | PartyType) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onPageChange: (value: number) => void;
}) {
  const t = useTranslations("reports.salesDetailed");
  const locale = useLocale();
  const limitOptions = useMemo<ComboboxOption[]>(
    () => [10, 20, 50, 100].map((value) => ({ value: String(value), label: String(value) })),
    []
  );
  const saleTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.saleTypeAll") },
      { value: "CASH", label: t("filters.saleTypeCash") },
      { value: "DEFERRED", label: t("filters.saleTypeDeferred") },
      { value: "INSTALLMENT", label: t("filters.saleTypeInstallment") },
    ],
    [t]
  );
  const partyTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.partyTypeAll") },
      { value: "CUSTOMER", label: t("filters.partyTypeCustomer") },
      { value: "SUPPLIER", label: t("filters.partyTypeSupplier") },
      { value: "EMPLOYEE", label: t("filters.partyTypeEmployee") },
    ],
    [t]
  );
  const columns = useMemo(
    () => [
      { id: "invoiceNumber", header: t("table.invoiceNumber"), accessor: (row: SalesDetailedItem) => row.invoiceNumber },
      { id: "issueDate", header: t("table.issueDate"), accessor: (row: SalesDetailedItem) => formatDate(row.issueDate, locale) },
      { id: "partyName", header: t("table.partyName"), accessor: (row: SalesDetailedItem) => row.partyName },
      { id: "partyType", header: t("table.partyType"), accessor: (row: SalesDetailedItem) => row.partyType },
      { id: "saleType", header: t("table.saleType"), accessor: (row: SalesDetailedItem) => row.saleType },
      {
        id: "totalAmount",
        header: t("table.totalAmount"),
        accessor: (row: SalesDetailedItem) => formatMoney(row.totalAmount, locale),
        cell: (row: SalesDetailedItem) => (
          <FinancialAmount amount={row.totalAmount} formatted={formatMoney(row.totalAmount, locale)} variant="table" />
        ),
      },
      {
        id: "taxAmount",
        header: t("table.taxAmount"),
        accessor: (row: SalesDetailedItem) => formatMoney(row.taxAmount, locale),
        cell: (row: SalesDetailedItem) => (
          <FinancialAmount amount={`-${row.taxAmount}`} formatted={formatMoney(row.taxAmount, locale)} variant="table" zeroNeutral={false} />
        ),
      },
      {
        id: "netAmount",
        header: t("table.netAmount"),
        accessor: (row: SalesDetailedItem) => formatMoney(row.netAmount, locale),
        cell: (row: SalesDetailedItem) => (
          <FinancialAmount amount={row.netAmount} formatted={formatMoney(row.netAmount, locale)} variant="table" />
        ),
      },
      { id: "createdBy", header: t("table.createdBy"), accessor: (row: SalesDetailedItem) => row.createdBy.fullName || "-" },
    ],
    [locale, t]
  );

  return (
    <section className="space-y-4">
      <div className={sectionCardClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitle")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
          <Input value={filters.search} onChange={(e) => onSearchChange(e.target.value)} placeholder={t("filters.search")} />
          <Combobox value={filters.saleType} options={saleTypeOptions} searchable={false} placeholder={t("filters.saleType")} searchPlaceholder={t("filters.saleType")} onChange={(value) => onSaleTypeChange((value as "all" | ReportSaleType | undefined) ?? "all")} />
          <Combobox value={filters.partyType} options={partyTypeOptions} searchable={false} placeholder={t("filters.partyType")} searchPlaceholder={t("filters.partyType")} onChange={(value) => onPartyTypeChange((value as "all" | PartyType | undefined) ?? "all")} />
          <DatePicker id="reports-sales-date-from" placeholder={t("filters.dateFrom")} defaultDate={filters.dateFrom || undefined} onChange={(_, dateStr) => onDateFromChange(dateStr || "")} options={{ allowInput: true }} />
          <DatePicker id="reports-sales-date-to" placeholder={t("filters.dateTo")} defaultDate={filters.dateTo || undefined} onChange={(_, dateStr) => onDateToChange(dateStr || "")} options={{ allowInput: true }} />
          <Combobox value={String(filters.limit)} options={limitOptions} searchable={false} placeholder={String(filters.limit)} searchPlaceholder={t("filters.limit")} onChange={(value) => onLimitChange(Number(value ?? 10))} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title={t("summary.invoicesCount")} value={String(summary.invoicesCount)} />
        <SummaryCard title={t("summary.grossAmount")} value={formatMoney(summary.grossAmount, locale)} amount={summary.grossAmount} />
        <SummaryCard title={t("summary.taxAmount")} value={formatMoney(summary.taxAmount, locale)} amount={`-${summary.taxAmount}`} />
        <SummaryCard title={t("summary.netAmount")} value={formatMoney(summary.netAmount, locale)} amount={summary.netAmount} />
      </div>
      <DataTable<SalesDetailedItem>
        data={items}
        columns={columns}
        loading={loading}
        error={error}
        getRowId={(row) => row.id}
        pagination={{ page: meta.page, limit: meta.limit, total: meta.total, totalPages: meta.totalPages, hasNextPage: meta.hasNext, hasPrevPage: meta.hasPrev }}
        onPageChange={onPageChange}
        ariaLabel={t("table.ariaLabel")}
      />
    </section>
  );
}

export function ExpensesAnalyticsSection({
  data,
  loading,
}: {
  data: ExpensesAnalyticsResponse;
  loading: boolean;
}) {
  const t = useTranslations("reports.expensesAnalytics");
  const locale = useLocale();
  return (
    <section className="space-y-4">
      <div className={sectionCardClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title={t("summary.totalAmount")} value={loading ? "..." : formatMoney(data.summary.totalAmount, locale)} amount={loading ? undefined : `-${data.summary.totalAmount}`} />
        <SummaryCard title={t("summary.expensesCount")} value={loading ? "..." : String(data.summary.expensesCount)} />
        <SummaryCard title={t("summary.averageExpense")} value={loading ? "..." : formatMoney(data.summary.averageExpense, locale)} amount={loading ? undefined : `-${data.summary.averageExpense}`} />
        <SummaryCard title={t("summary.byCategoryCount")} value={loading ? "..." : String(data.byCategory.length)} />
      </div>
    </section>
  );
}

export function ProductsPerformanceSection({
  data,
  loading,
}: {
  data: ProductsPerformanceResponse;
  loading: boolean;
}) {
  const t = useTranslations("reports.productsPerformance");
  const locale = useLocale();
  const columns = useMemo(
    () => [
      { id: "productName", header: t("table.productName"), accessor: (row: ProductsPerformanceResponse["items"][number]) => row.productName },
      { id: "sku", header: t("table.sku"), accessor: (row: ProductsPerformanceResponse["items"][number]) => row.sku || "-" },
      { id: "category", header: t("table.category"), accessor: (row: ProductsPerformanceResponse["items"][number]) => row.category || "-" },
      { id: "quantitySold", header: t("table.quantitySold"), accessor: (row: ProductsPerformanceResponse["items"][number]) => row.quantitySold },
      {
        id: "salesAmount",
        header: t("table.salesAmount"),
        accessor: (row: ProductsPerformanceResponse["items"][number]) => formatMoney(row.salesAmount, locale),
        cell: (row: ProductsPerformanceResponse["items"][number]) => (
          <FinancialAmount amount={row.salesAmount} formatted={formatMoney(row.salesAmount, locale)} variant="table" />
        ),
      },
      {
        id: "averageUnitPrice",
        header: t("table.averageUnitPrice"),
        accessor: (row: ProductsPerformanceResponse["items"][number]) => formatMoney(row.averageUnitPrice, locale),
        cell: (row: ProductsPerformanceResponse["items"][number]) => (
          <FinancialAmount amount={row.averageUnitPrice} formatted={formatMoney(row.averageUnitPrice, locale)} variant="table" />
        ),
      },
      { id: "invoicesCount", header: t("table.invoicesCount"), accessor: (row: ProductsPerformanceResponse["items"][number]) => row.invoicesCount },
    ],
    [locale, t]
  );

  return (
    <section className="space-y-4">
      <div className={sectionCardClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard title={t("summary.totalProducts")} value={loading ? "..." : String(data.summary.totalProducts)} />
        <SummaryCard title={t("summary.totalQuantity")} value={loading ? "..." : data.summary.totalQuantity} />
        <SummaryCard title={t("summary.totalSalesAmount")} value={loading ? "..." : formatMoney(data.summary.totalSalesAmount, locale)} amount={loading ? undefined : data.summary.totalSalesAmount} />
      </div>
      <DataTable<ProductsPerformanceResponse["items"][number]>
        data={data.items}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.productId ?? row.productName}
        pagination={{ page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, hasNextPage: data.meta.hasNext, hasPrevPage: data.meta.hasPrev }}
        ariaLabel={t("table.ariaLabel")}
      />
    </section>
  );
}

export function OperationalPerformanceSection({
  data,
  loading,
}: {
  data: OperationalPerformanceResponse;
  loading: boolean;
}) {
  const t = useTranslations("reports.operationalPerformance");
  const locale = useLocale();
  return (
    <section className="space-y-4">
      <div className={sectionCardClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title={t("summary.revenue")} value={loading ? "..." : formatMoney(data.sales.revenue, locale)} amount={loading ? undefined : data.sales.revenue} />
        <SummaryCard title={t("summary.avgInvoiceValue")} value={loading ? "..." : formatMoney(data.sales.avgInvoiceValue, locale)} amount={loading ? undefined : data.sales.avgInvoiceValue} />
        <SummaryCard title={t("summary.expensesTotal")} value={loading ? "..." : formatMoney(data.expenses.total, locale)} amount={loading ? undefined : `-${data.expenses.total}`} />
        <SummaryCard title={t("summary.collectionRate")} value={loading ? "..." : `${data.collections.collectionRatePercent}%`} />
      </div>
    </section>
  );
}

export function CriticalAlertsSection({
  data,
  loading,
}: {
  data: CriticalAlertsResponse;
  loading: boolean;
}) {
  const t = useTranslations("reports.criticalAlerts");
  return (
    <section className="space-y-4">
      <div className={sectionCardClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title={t("summary.creditRiskCount")} value={loading ? "..." : String(data.creditLimitRisk.length)} />
        <SummaryCard title={t("summary.largeOverduesCount")} value={loading ? "..." : String(data.largeOverdues.length)} />
        <SummaryCard title={t("summary.upcomingInstallmentsCount")} value={loading ? "..." : String(data.upcomingInstallments.length)} />
        <SummaryCard title={t("summary.expensesSpikeAlert")} value={loading ? "..." : data.expensesSpike.isAlert ? t("values.yes") : t("values.no")} />
      </div>
    </section>
  );
}

export function LedgerStatementReportSection({
  data,
  loading,
}: {
  data: ReportsLedgerStatementResponse;
  loading: boolean;
}) {
  const t = useTranslations("reports.ledgerStatement");
  const locale = useLocale();
  const columns = useMemo(
    () => [
      { id: "date", header: t("table.date"), accessor: (row: ReportsLedgerStatementResponse["items"][number]) => formatDate(row.date, locale) },
      { id: "entryType", header: t("table.entryType"), accessor: (row: ReportsLedgerStatementResponse["items"][number]) => row.entryType },
      {
        id: "debit",
        header: t("table.debit"),
        accessor: (row: ReportsLedgerStatementResponse["items"][number]) => formatMoney(row.debit, locale),
        cell: (row: ReportsLedgerStatementResponse["items"][number]) => (
          <FinancialAmount amount={row.debit} formatted={formatMoney(row.debit, locale)} variant="table" />
        ),
      },
      {
        id: "credit",
        header: t("table.credit"),
        accessor: (row: ReportsLedgerStatementResponse["items"][number]) => formatMoney(row.credit, locale),
        cell: (row: ReportsLedgerStatementResponse["items"][number]) => (
          <FinancialAmount amount={`-${row.credit}`} formatted={formatMoney(row.credit, locale)} variant="table" zeroNeutral={false} />
        ),
      },
      {
        id: "runningBalance",
        header: t("table.runningBalance"),
        accessor: (row: ReportsLedgerStatementResponse["items"][number]) => formatMoney(row.runningBalance, locale),
        cell: (row: ReportsLedgerStatementResponse["items"][number]) => (
          <FinancialAmount amount={row.runningBalance} formatted={formatMoney(row.runningBalance, locale)} variant="table" />
        ),
      },
      { id: "note", header: t("table.note"), accessor: (row: ReportsLedgerStatementResponse["items"][number]) => row.note || "-" },
    ],
    [locale, t]
  );

  return (
    <section className="space-y-4">
      <div className={sectionCardClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title={t("summary.openingBalance")} value={loading ? "..." : formatMoney(data.openingBalance, locale)} amount={loading ? undefined : data.openingBalance} />
        <SummaryCard title={t("summary.totalDebit")} value={loading ? "..." : formatMoney(data.totalDebit, locale)} amount={loading ? undefined : data.totalDebit} />
        <SummaryCard title={t("summary.totalCredit")} value={loading ? "..." : formatMoney(data.totalCredit, locale)} amount={loading ? undefined : `-${data.totalCredit}`} />
        <SummaryCard title={t("summary.closingBalance")} value={loading ? "..." : formatMoney(data.closingBalance, locale)} amount={loading ? undefined : data.closingBalance} />
        <SummaryCard title={t("summary.currentBalance")} value={loading ? "..." : formatMoney(data.currentBalance, locale)} amount={loading ? undefined : data.currentBalance} />
      </div>
      <DataTable<ReportsLedgerStatementResponse["items"][number]>
        data={data.items}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        pagination={{ page: data.meta.page, limit: data.meta.limit, total: data.meta.total, totalPages: data.meta.totalPages, hasNextPage: data.meta.hasNext, hasPrevPage: data.meta.hasPrev }}
        ariaLabel={t("table.ariaLabel")}
      />
    </section>
  );
}

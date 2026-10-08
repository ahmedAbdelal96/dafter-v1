"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FinancialAmount } from "@/components/common/FinancialAmount";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { QueryState } from "@/components/common/QueryState";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { API_LIMITS } from "@/lib/api/config";
import { useEmployees } from "@/lib/api/hooks/use-employees";
import { useCreateLedgerEntry, useDeleteLedgerEntry, useLedgerStatement } from "@/lib/api/hooks/use-ledger";
import { ledgerApi } from "@/lib/api/services";
import type { CreateLedgerEntryRequest, LedgerStatementItem } from "@/lib/api/types";
import { exportRowsToExcel, fetchAllTotalItems } from "@/lib/export/excel-export";
import { formatMoney } from "../utils/employee-format";
import { EmployeePayrollEntryModal } from "./EmployeePayrollEntryModal";

type PayrollEntryType = "SALARY_PAYMENT" | "ADVANCE" | "DEDUCTION";

const PAYROLL_TYPES = new Set<PayrollEntryType>(["SALARY_PAYMENT", "ADVANCE", "DEDUCTION"]);

function isPayrollType(value: string): value is PayrollEntryType {
  return PAYROLL_TYPES.has(value as PayrollEntryType);
}

function toNumber(value: string | number): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function EmployeesPayrollPageClient() {
  const t = useTranslations("employees");
  const locale = useLocale();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();
  const { hasPermission } = usePermission();

  const canCreateLedger = hasPermission("ledger:create");
  const canDeleteLedger = hasPermission("ledger:delete");

  const [employeeId, setEmployeeId] = useState<string>("");
  const [periodPreset, setPeriodPreset] = useState<
    "all" | "thisMonth" | "lastMonth" | "thisYear" | "custom"
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<PayrollEntryType>("SALARY_PAYMENT");
  const [isExporting, setIsExporting] = useState(false);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);

  const employeesQuery = useEmployees({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    sortBy: "name",
    sortOrder: "asc",
  });

  const statementQuery = useLedgerStatement(
    {
      partyType: "EMPLOYEE",
      partyId: employeeId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: 1,
      limit: API_LIMITS.MAX_PAGE_LIMIT,
    },
    Boolean(employeeId)
  );

  const createEntryMutation = useCreateLedgerEntry();
  const deleteEntryMutation = useDeleteLedgerEntry();

  const employeeOptions = useMemo<ComboboxOption[]>(
    () =>
      (employeesQuery.data?.items ?? []).map((employee) => ({
        value: employee.id,
        label: employee.jobTitle
          ? `${employee.name} - ${employee.jobTitle}`
          : employee.name,
      })),
    [employeesQuery.data?.items]
  );

  const payrollEntriesBase = useMemo(() => {
    const items = statementQuery.data?.items ?? [];
    return items.filter((entry) => isPayrollType(entry.entryType));
  }, [statementQuery.data?.items]);

  const payrollEntries = useMemo(() => {
    const items = statementQuery.data?.items ?? [];
    const term = searchTerm.trim().toLowerCase();

    return items.filter((entry) => {
      if (!isPayrollType(entry.entryType)) return false;
      if (!term) return true;

      const typeLabel = t(`payroll.entryTypes.${entry.entryType}`).toLowerCase();
      const note = (entry.note ?? "").toLowerCase();
      return note.includes(term) || typeLabel.includes(term);
    });
  }, [searchTerm, statementQuery.data?.items, t]);

  const pagination = useMemo(() => {
    const total = payrollEntries.length;
    const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const end = start + limit;

    return {
      total,
      totalPages,
      page: safePage,
      items: payrollEntries.slice(start, end),
    };
  }, [limit, page, payrollEntries]);

  const totals = useMemo(() => {
    const source = payrollEntriesBase;
    const salaryPayments = source
      .filter((entry) => entry.entryType === "SALARY_PAYMENT")
      .reduce((acc, entry) => acc + Math.abs(toNumber(entry.signedAmount)), 0);
    const advances = source
      .filter((entry) => entry.entryType === "ADVANCE")
      .reduce((acc, entry) => acc + Math.abs(toNumber(entry.signedAmount)), 0);
    const deductions = source
      .filter((entry) => entry.entryType === "DEDUCTION")
      .reduce((acc, entry) => acc + Math.abs(toNumber(entry.signedAmount)), 0);
    const netAmount = salaryPayments - advances - deductions;

    return { salaryPayments, advances, deductions, netAmount };
  }, [payrollEntriesBase]);

  const monthlyAndYearlyNet = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const computeNet = (entries: LedgerStatementItem[]) => {
      const salaryPayments = entries
        .filter((entry) => entry.entryType === "SALARY_PAYMENT")
        .reduce((acc, entry) => acc + Math.abs(toNumber(entry.signedAmount)), 0);
      const advances = entries
        .filter((entry) => entry.entryType === "ADVANCE")
        .reduce((acc, entry) => acc + Math.abs(toNumber(entry.signedAmount)), 0);
      const deductions = entries
        .filter((entry) => entry.entryType === "DEDUCTION")
        .reduce((acc, entry) => acc + Math.abs(toNumber(entry.signedAmount)), 0);
      return salaryPayments - advances - deductions;
    };

    const monthlyEntries = payrollEntriesBase.filter(
      (entry) => new Date(entry.entryDate) >= monthStart
    );
    const yearlyEntries = payrollEntriesBase.filter(
      (entry) => new Date(entry.entryDate) >= yearStart
    );

    return {
      monthlyNet: computeNet(monthlyEntries),
      yearlyNet: computeNet(yearlyEntries),
      transactionsCount: payrollEntriesBase.length,
    };
  }, [payrollEntriesBase]);

  const selectedEmployee = (employeesQuery.data?.items ?? []).find(
    (item) => item.id === employeeId
  );

  const handleCreateEntry = async (payload: CreateLedgerEntryRequest) => {
    try {
      await createEntryMutation.mutateAsync(payload);
      showSuccess(t("payroll.messages.createSuccess"));
      setIsCreateModalOpen(false);
    } catch (error) {
      handleApiError(error, t("payroll.messages.createError"));
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm(t("payroll.messages.deleteConfirm"))) {
      return;
    }

    try {
      await deleteEntryMutation.mutateAsync(entryId);
      showSuccess(t("payroll.messages.deleteSuccess"));
    } catch (error) {
      handleApiError(error, t("payroll.messages.deleteError"));
    }
  };

  const periodOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("payroll.filters.periods.all") },
      { value: "thisMonth", label: t("payroll.filters.periods.thisMonth") },
      { value: "lastMonth", label: t("payroll.filters.periods.lastMonth") },
      { value: "thisYear", label: t("payroll.filters.periods.thisYear") },
      { value: "custom", label: t("payroll.filters.periods.custom") },
    ],
    [t]
  );

  const applyPeriodPreset = (
    preset: "all" | "thisMonth" | "lastMonth" | "thisYear" | "custom"
  ) => {
    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    const now = new Date();

    setPeriodPreset(preset);
    setPage(1);

    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
      return;
    }

    if (preset === "custom") {
      return;
    }

    if (preset === "thisMonth") {
      setDateFrom(formatDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      setDateTo(formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
      return;
    }

    if (preset === "lastMonth") {
      setDateFrom(formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setDateTo(formatDate(new Date(now.getFullYear(), now.getMonth(), 0)));
      return;
    }

    setDateFrom(formatDate(new Date(now.getFullYear(), 0, 1)));
    setDateTo(formatDate(new Date(now.getFullYear(), 11, 31)));
  };

  const handleExportExcel = async (scope?: ExportScope) => {
    if (!employeeId) {
      showInfo(t("payroll.messages.exportEmpty"));
      return;
    }

    try {
      setIsExporting(true);
      const scopedDateFrom = scope?.dateFrom ?? (dateFrom || undefined);
      const scopedDateTo = scope?.dateTo ?? (dateTo || undefined);
      const allEntries = await fetchAllTotalItems((currentPage, pageSize) =>
        ledgerApi.getStatement({
          partyType: "EMPLOYEE",
          partyId: employeeId,
          dateFrom: scopedDateFrom,
          dateTo: scopedDateTo,
          page: currentPage,
          limit: pageSize,
        }),
        { maxItems: scope?.maxRecords }
      );
      const payrollEntries = allEntries.filter((entry) => isPayrollType(entry.entryType));

      const term = searchTerm.trim().toLowerCase();
      const filtered = payrollEntries.filter((entry) => {
        if (!term) return true;
        const typeLabel = t(`payroll.entryTypes.${entry.entryType}`).toLowerCase();
        const note = (entry.note ?? "").toLowerCase();
        return note.includes(term) || typeLabel.includes(term);
      });

      if (filtered.length === 0) {
        showInfo(t("payroll.messages.exportEmpty"));
        return;
      }

      const exportRows = filtered.map((entry) => ({
        [t("payroll.table.date")]: dateFormatter.format(new Date(entry.entryDate)),
        [t("payroll.table.type")]: t(`payroll.entryTypes.${entry.entryType}`),
        [t("payroll.table.note")]: entry.note || "-",
        [t("payroll.table.amount")]: toNumber(entry.signedAmount),
        [t("payroll.table.runningBalance")]: toNumber(entry.runningBalance),
      }));

      const employeeName =
        selectedEmployee?.name?.replace(/[^\w\u0600-\u06FF-]+/g, "_") || "employee";
      await exportRowsToExcel(exportRows, {
        locale,
        sheetName: t("payroll.export.sheetName"),
        filePrefix: `${t("payroll.export.filePrefix")}_${employeeName}`,
        columnWidths: [18, 18, 42, 18, 18],
      });

      showSuccess(t("payroll.messages.exportSuccess"));
    } catch (error) {
      handleApiError(error, t("payroll.messages.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    [locale]
  );

  const limitOptions = useMemo<ComboboxOption[]>(
    () =>
      [10, 20, 50].map((count) => ({
        value: String(count),
        label: t("filters.perPage", { count }),
      })),
    [t]
  );

  const isLoading = employeesQuery.isLoading || (Boolean(employeeId) && statementQuery.isLoading);
  const isError = employeesQuery.isError || statementQuery.isError;
  const errorMessage = employeesQuery.error?.message ?? statementQuery.error?.message;
  const isEmpty = Boolean(employeeId) && !isLoading && pagination.total === 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white">{t("payroll.title")}</h1>
            <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">{t("payroll.subtitle")}</p>
          </div>

          {canCreateLedger && employeeId && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                startIcon={<Plus size={16} />}
                onClick={() => {
                  setCreateType("SALARY_PAYMENT");
                  setIsCreateModalOpen(true);
                }}
              >
                {t("payroll.actions.addSalary")}
              </Button>
              <Button
                variant="outline"
                startIcon={<Plus size={16} />}
                onClick={() => {
                  setCreateType("ADVANCE");
                  setIsCreateModalOpen(true);
                }}
              >
                {t("payroll.actions.addAdvance")}
              </Button>
              <Button
                startIcon={<Plus size={16} />}
                onClick={() => {
                  setCreateType("DEDUCTION");
                  setIsCreateModalOpen(true);
                }}
              >
                {t("payroll.actions.addDeduction")}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-slate-300">
              {t("payroll.filters.employee")}
            </label>
            <Combobox
              value={employeeId}
              options={employeeOptions}
              searchable
              placeholder={t("payroll.filters.selectEmployee")}
              searchPlaceholder={t("payroll.filters.searchEmployee")}
              emptyText={t("payroll.filters.noEmployees")}
              onChange={(value) => {
                setEmployeeId(value ?? "");
                setPage(1);
              }}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-slate-300">
              {t("payroll.filters.period")}
            </label>
            <Combobox
              value={periodPreset}
              options={periodOptions}
              searchable={false}
              placeholder={t("payroll.filters.period")}
              searchPlaceholder={t("payroll.filters.period")}
              onChange={(value) =>
                applyPeriodPreset(
                  (value as "all" | "thisMonth" | "lastMonth" | "thisYear" | "custom" | undefined) ??
                    "all"
                )
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-slate-300">
              {t("payroll.filters.from")}
            </label>
            <DatePicker
              id="employees-payroll-date-from"
              placeholder={t("payroll.filters.from")}
              defaultDate={dateFrom || undefined}
              onChange={(_, dateStr) => {
                setPeriodPreset("custom");
                setDateFrom(dateStr || "");
                setPage(1);
              }}
              options={{ allowInput: true }}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-slate-300">
              {t("payroll.filters.to")}
            </label>
            <DatePicker
              id="employees-payroll-date-to"
              placeholder={t("payroll.filters.to")}
              defaultDate={dateTo || undefined}
              onChange={(_, dateStr) => {
                setPeriodPreset("custom");
                setDateTo(dateStr || "");
                setPage(1);
              }}
              options={{ allowInput: true }}
            />
          </div>
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-slate-300">
              {t("payroll.filters.search")}
            </label>
            <input
              type="text"
              className="h-11 w-full rounded-2xl border border-border-light/80 bg-white/80 px-3 text-sm text-text-primary shadow-theme-xs focus:border-border-focus focus:outline-none focus:ring-3 focus:ring-primary/10 dark:border-white/8 dark:bg-white/[0.04] dark:text-white"
              value={searchTerm}
              placeholder={t("payroll.filters.searchPlaceholder")}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </section>

      {!employeeId ? (
        <section className="rounded-3xl border border-border-light/90 bg-white/92 p-8 text-center shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90">
          <h2 className="text-lg font-semibold tracking-tight text-text-primary dark:text-white">
            {t("payroll.selectEmployeeTitle")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary dark:text-slate-300">
            {t("payroll.selectEmployeeDescription")}
          </p>
        </section>
      ) : (
        <QueryState
          isLoading={isLoading}
          isError={isError}
          errorMessage={errorMessage}
          isEmpty={isEmpty}
          emptyTitle={t("payroll.empty.title")}
          emptyDescription={t("payroll.empty.description")}
          emptyAction={
            canCreateLedger
              ? {
                  label: t("payroll.actions.createEntry"),
                  onClick: () => {
                    setCreateType("SALARY_PAYMENT");
                    setIsCreateModalOpen(true);
                  },
                }
              : undefined
          }
        >
          <section className="grid grid-cols-1 gap-4 md:grid-cols-7">
            <SummaryCard
              label={t("payroll.summary.salaryPayments")}
              value={formatMoney(totals.salaryPayments, locale)}
              amount={totals.salaryPayments}
            />
            <SummaryCard
              label={t("payroll.summary.advances")}
              value={formatMoney(totals.advances, locale)}
              amount={-totals.advances}
            />
            <SummaryCard
              label={t("payroll.summary.deductions")}
              value={formatMoney(totals.deductions, locale)}
              amount={-totals.deductions}
            />
            <SummaryCard
              label={t("payroll.summary.netPayout")}
              value={formatMoney(totals.netAmount, locale)}
              amount={totals.netAmount}
            />
            <SummaryCard
              label={t("payroll.summary.monthlyNet")}
              value={formatMoney(monthlyAndYearlyNet.monthlyNet, locale)}
              amount={monthlyAndYearlyNet.monthlyNet}
            />
            <SummaryCard
              label={t("payroll.summary.yearlyNet")}
              value={formatMoney(monthlyAndYearlyNet.yearlyNet, locale)}
              amount={monthlyAndYearlyNet.yearlyNet}
            />
            <SummaryCard
              label={t("payroll.summary.transactionsCount")}
              value={String(monthlyAndYearlyNet.transactionsCount)}
              tone="neutral"
            />
          </section>

          <section className="rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-text-primary dark:text-white">
                  {t("payroll.table.title", {
                    employeeName: selectedEmployee?.name ?? "-",
                  })}
                </h2>
                <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">
                  {t("payroll.table.subtitle", {
                    balance: formatMoney(statementQuery.data?.currentBalance ?? 0, locale),
                  })}
                </p>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <div className="w-full sm:w-48">
                  <Combobox
                    value={String(limit)}
                    options={limitOptions}
                    searchable={false}
                    placeholder={t("filters.perPage", { count: limit })}
                    searchPlaceholder={t("filters.searchPlaceholder")}
                    onChange={(value) => {
                      setLimit(Number(value ?? 10));
                      setPage(1);
                    }}
                  />
                </div>
                <Button variant="outline" onClick={() => setIsExportScopeOpen(true)} disabled={isExporting}>
                  {isExporting ? t("payroll.actions.exporting") : t("payroll.actions.exportExcel")}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted dark:border-white/8">
                    <th className="px-3 py-3">{t("payroll.table.date")}</th>
                    <th className="px-3 py-3">{t("payroll.table.type")}</th>
                    <th className="px-3 py-3">{t("payroll.table.note")}</th>
                    <th className="px-3 py-3">{t("payroll.table.amount")}</th>
                    <th className="px-3 py-3">{t("payroll.table.runningBalance")}</th>
                    {canDeleteLedger && <th className="px-3 py-3">{t("payroll.table.actions")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {pagination.items.map((entry) => (
                    <PayrollRow
                      key={entry.id}
                      entry={entry}
                      locale={locale}
                      dateFormatter={dateFormatter}
                      canDelete={canDeleteLedger}
                      deleting={deleteEntryMutation.isPending}
                      onDelete={handleDeleteEntry}
                      typeLabel={t(`payroll.entryTypes.${entry.entryType}`)}
                      deleteLabel={t("actions.delete")}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-light pt-4 text-sm dark:border-white/8">
              <span className="text-text-secondary dark:text-slate-300">
                {t("payroll.pagination.summary", {
                  page: pagination.page,
                  totalPages: pagination.totalPages,
                  total: pagination.total,
                })}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  {t("payroll.pagination.previous")}
                </Button>
                <Button
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPage((prev) => Math.min(pagination.totalPages, prev + 1))
                  }
                >
                  {t("payroll.pagination.next")}
                </Button>
              </div>
            </div>
          </section>
        </QueryState>
      )}

      <EmployeePayrollEntryModal
        open={isCreateModalOpen}
        loading={createEntryMutation.isPending}
        employeeId={employeeId}
        initialType={createType}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEntry}
      />

      <ExportScopeModal
        open={isExportScopeOpen}
        loading={isExporting}
        initialScope={{
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }}
        labels={{
          title: t("payroll.exportModal.title"),
          description: `${t("payroll.exportModal.description")} (${pagination.total})`,
          fromDate: t("payroll.exportModal.fromDate"),
          toDate: t("payroll.exportModal.toDate"),
          maxRecords: t("payroll.exportModal.maxRecords"),
          maxRecordsHint: t("payroll.exportModal.maxRecordsHint"),
          reset: t("payroll.exportModal.reset"),
          cancel: t("actions.cancel"),
          confirm: t("payroll.actions.exportExcel"),
        }}
        onClose={() => setIsExportScopeOpen(false)}
        onConfirm={(scope) => {
          setIsExportScopeOpen(false);
          void handleExportExcel(scope);
        }}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  amount,
  tone,
}: {
  label: string;
  value: string;
  amount?: number;
  tone?: "positive" | "negative" | "neutral";
}) {
  const resolvedTone =
    tone ??
    (typeof amount === "number"
      ? amount > 0
        ? "positive"
        : amount < 0
        ? "negative"
        : "neutral"
      : "neutral");

  const valueClass =
    resolvedTone === "positive"
      ? "finance-positive"
      : resolvedTone === "negative"
      ? "finance-risk"
      : "text-text-secondary dark:text-slate-300";

  return (
    <div className="rounded-3xl border border-border-light/90 bg-white/90 p-4 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className={`mt-2 text-lg font-semibold tracking-tight ${valueClass}`}>{value}</div>
    </div>
  );
}

function PayrollRow({
  entry,
  locale,
  dateFormatter,
  canDelete,
  deleting,
  onDelete,
  typeLabel,
  deleteLabel,
}: {
  entry: LedgerStatementItem;
  locale: string;
  dateFormatter: Intl.DateTimeFormat;
  canDelete: boolean;
  deleting: boolean;
  onDelete: (entryId: string) => Promise<void>;
  typeLabel: string;
  deleteLabel: string;
}) {
  const amount = toNumber(entry.signedAmount);
  return (
    <tr className="border-b border-border-light/70 last:border-b-0 dark:border-white/8">
      <td className="px-3 py-3 text-text-secondary dark:text-slate-200">
        {dateFormatter.format(new Date(entry.entryDate))}
      </td>
      <td className="px-3 py-3 text-text-secondary dark:text-slate-200">{typeLabel}</td>
      <td className="max-w-sm truncate px-3 py-3 text-text-secondary dark:text-slate-300">
        {entry.note || "-"}
      </td>
      <td className="px-3 py-3">
        <FinancialAmount
          amount={amount}
          formatted={formatMoney(amount, locale)}
          variant="table"
        />
      </td>
      <td className="px-3 py-3">
        <FinancialAmount
          amount={entry.runningBalance}
          formatted={formatMoney(entry.runningBalance, locale)}
          variant="table"
        />
      </td>
      {canDelete && (
        <td className="px-3 py-3">
          <Button
            variant="outline"
            disabled={deleting}
            onClick={() => void onDelete(entry.id)}
          >
            {deleteLabel}
          </Button>
        </td>
      )}
    </tr>
  );
}

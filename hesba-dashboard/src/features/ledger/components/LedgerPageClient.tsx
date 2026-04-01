"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ComboboxOption } from "@/components/ui/combobox/Combobox";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { API_LIMITS } from "@/lib/api/config";
import { useCustomers } from "@/lib/api/hooks/use-customers";
import { useSuppliers } from "@/lib/api/hooks/use-suppliers";
import { useEmployees } from "@/lib/api/hooks/use-employees";
import {
  useCreateLedgerEntry,
  useDeleteLedgerEntry,
  useLedgerStatement,
} from "@/lib/api/hooks/use-ledger";
import { ledgerApi } from "@/lib/api/services";
import { exportRowsToExcel, fetchAllTotalItems } from "@/lib/export/excel-export";
import type { CreateLedgerEntryRequest, PartyType } from "@/lib/api/types";
import { LedgerEntryCreateModal } from "./LedgerEntryCreateModal";
import { LedgerTable } from "./LedgerTable";
import { LedgerToolbar } from "./LedgerToolbar";
import { DEFAULT_LEDGER_LIMIT } from "../utils/ledger-schemas";
import { formatMoney } from "../utils/ledger-format";

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

function normalizePartyType(value: string | null): PartyType {
  return value === "SUPPLIER" || value === "EMPLOYEE" || value === "CUSTOMER"
    ? value
    : "CUSTOMER";
}

export function LedgerPageClient() {
  const t = useTranslations("ledger");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermission();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();

  const canViewLedger = hasPermission("ledger:view");
  const canCreateLedger = hasPermission("ledger:create");
  const canDeleteLedger = hasPermission("ledger:delete");

  const [partyType, setPartyType] = useState<PartyType>(() => normalizePartyType(searchParams.get("partyType")));
  const [partyId, setPartyId] = useState<string | undefined>(() => searchParams.get("partyId") || undefined);
  const [partySearchInput, setPartySearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LEDGER_LIMIT);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canExportLedger = canViewLedger && Boolean(partyId);

  const debouncedPartySearch = useDebouncedValue(partySearchInput, 350);

  useEffect(() => {
    const nextPartyType = normalizePartyType(searchParams.get("partyType"));
    const nextPartyId = searchParams.get("partyId") || undefined;

    setPartyType((current) => (current === nextPartyType ? current : nextPartyType));
    setPartyId((current) => (current === nextPartyId ? current : nextPartyId));
  }, [searchParams]);

  const syncLedgerUrl = (nextPartyType: PartyType, nextPartyId?: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("partyType", nextPartyType);

    if (nextPartyId) {
      nextParams.set("partyId", nextPartyId);
    } else {
      nextParams.delete("partyId");
    }

    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  // Fetch lookup lists in parallel to keep switching party type instant.
  const customersQuery = useCustomers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: debouncedPartySearch || undefined,
  });
  const suppliersQuery = useSuppliers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: debouncedPartySearch || undefined,
  });
  const employeesQuery = useEmployees({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: debouncedPartySearch || undefined,
  });

  const statementFilters = useMemo(
    () => ({
      partyType,
      partyId: partyId ?? "",
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit,
    }),
    [partyType, partyId, dateFrom, dateTo, page, limit]
  );

  const statementQuery = useLedgerStatement(statementFilters, canViewLedger && Boolean(partyId));
  const createEntryMutation = useCreateLedgerEntry();
  const deleteEntryMutation = useDeleteLedgerEntry();
  const statement = statementQuery.data;

  const partyOptions = useMemo<ComboboxOption[]>(() => {
    if (partyType === "CUSTOMER") {
      return sortByName(customersQuery.data?.items ?? []).map((item) => ({
        value: item.id,
        label: item.name,
        description: item.phone ?? undefined,
      }));
    }

    if (partyType === "SUPPLIER") {
      return sortByName(suppliersQuery.data?.items ?? []).map((item) => ({
        value: item.id,
        label: item.name,
        description: item.phone ?? undefined,
      }));
    }

    return sortByName(employeesQuery.data?.items ?? []).map((item) => ({
      value: item.id,
      label: item.name,
      description: item.jobTitle ?? item.phone ?? undefined,
    }));
  }, [
    customersQuery.data?.items,
    employeesQuery.data?.items,
    partyType,
    suppliersQuery.data?.items,
  ]);

  const partyLookupLoading = customersQuery.isFetching || suppliersQuery.isFetching || employeesQuery.isFetching;

  const handleCreateEntry = async (payload: CreateLedgerEntryRequest) => {
    try {
      await createEntryMutation.mutateAsync(payload);
      showSuccess(t("messages.createSuccess"));
      const projectedTotal = (statement?.total ?? 0) + 1;
      setPage(Math.max(1, Math.ceil(projectedTotal / Math.max(limit, 1))));
      setIsCreateModalOpen(false);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm(t("messages.deleteConfirm"))) {
      return;
    }

    try {
      await deleteEntryMutation.mutateAsync(entryId);
      showSuccess(t("messages.deleteSuccess"));

      const nextTotal = Math.max(0, (statement?.total ?? 0) - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / Math.max(limit, 1)));
      if (page > nextTotalPages) {
        setPage(nextTotalPages);
      }
    } catch (error) {
      handleApiError(error, t("messages.deleteError"));
    }
  };

  const handleExportExcel = async (scope?: ExportScope) => {
    if (!partyId) return;

    try {
      setIsExporting(true);
      const exportFilters = {
        ...statementFilters,
        dateFrom: scope?.dateFrom ?? statementFilters.dateFrom,
        dateTo: scope?.dateTo ?? statementFilters.dateTo,
      };

      const allItems = await fetchAllTotalItems((currentPage, pageSize) =>
        ledgerApi.getStatement({
          ...exportFilters,
          page: currentPage,
          limit: pageSize,
        }).then((response) => ({ items: response.items, total: response.total })),
      { maxItems: scope?.maxRecords });

      if (allItems.length === 0) {
        showInfo(t("messages.exportEmpty"));
        return;
      }

      const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });

      const rows = allItems.map((entry) => ({
        [t("table.date")]: dateFormatter.format(new Date(entry.entryDate)),
        [t("table.type")]: t(`entryTypes.${entry.entryType}`),
        [t("table.note")]: entry.note || "-",
        [t("table.amount")]: formatMoney(entry.signedAmount, locale),
        [t("table.runningBalance")]: formatMoney(entry.runningBalance, locale),
        [t("table.createdAt")]: dateFormatter.format(new Date(entry.createdAt)),
      }));

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [18, 16, 40, 18, 20, 18],
      });
      showSuccess(t("messages.exportSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  if (!canViewLedger) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("title")}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("noPermission")}</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <LedgerToolbar
        partyType={partyType}
        partyId={partyId}
        partyOptions={partyOptions}
        partyLoading={partyLookupLoading}
        dateFrom={dateFrom}
        dateTo={dateTo}
        limit={limit}
        canCreate={canCreateLedger && Boolean(partyId)}
        canExport={canExportLedger}
        isExporting={isExporting}
        onPartyTypeChange={(value) => {
          setPartyType(value);
          setPartyId(undefined);
          setPartySearchInput("");
          setPage(1);
          syncLedgerUrl(value, undefined);
        }}
        onPartyChange={(value) => {
          setPartyId(value);
          setPage(1);
          syncLedgerUrl(partyType, value);
        }}
        onPartySearchChange={setPartySearchInput}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(1);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(1);
        }}
        onLimitChange={(value) => {
          setLimit(Math.min(Math.max(value, 1), API_LIMITS.MAX_PAGE_LIMIT));
          setPage(1);
        }}
        onResetFilters={() => {
          setDateFrom("");
          setDateTo("");
          setPage(1);
        }}
        onCreateClick={() => setIsCreateModalOpen(true)}
        onExportClick={() => setIsExportScopeOpen(true)}
      />

      {!partyId ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("emptySelection.title")}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("emptySelection.description")}
          </p>
        </section>
      ) : (
        <QueryState
          isLoading={statementQuery.isLoading}
          isError={statementQuery.isError}
          errorMessage={statementQuery.error?.message}
          isEmpty={!statementQuery.isLoading && (statement?.items.length ?? 0) === 0}
          emptyTitle={t("empty.title")}
          emptyDescription={t("empty.description")}
          emptyAction={
            canCreateLedger
              ? {
                  label: t("actions.addEntry"),
                  onClick: () => setIsCreateModalOpen(true),
                }
              : undefined
          }
        >
          {statement ? (
            <div className="space-y-4">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SummaryCard
                  label={t("summary.current")}
                  value={formatMoney(statement.currentBalance, locale)}
                />
                <SummaryCard
                  label={t("summary.opening")}
                  value={formatMoney(statement.openingBalanceForPeriod, locale)}
                />
                <SummaryCard
                  label={t("summary.closing")}
                  value={formatMoney(statement.closingBalanceForPeriod, locale)}
                />
              </section>

              <LedgerTable
                statement={statement}
                canDelete={canDeleteLedger}
                deleting={deleteEntryMutation.isPending}
                onDelete={handleDeleteEntry}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </QueryState>
      )}

      <LedgerEntryCreateModal
        open={isCreateModalOpen}
        loading={createEntryMutation.isPending}
        partyType={partyType}
        partyId={partyId}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEntry}
      />

      <ExportScopeModal
        open={isExportScopeOpen}
        loading={isExporting}
        initialScope={{
          dateFrom: statementFilters.dateFrom,
          dateTo: statementFilters.dateTo,
        }}
        labels={{
          title: t("exportModal.title"),
          description: `${t("exportModal.description")} (${statement?.total ?? 0})`,
          fromDate: t("exportModal.fromDate"),
          toDate: t("exportModal.toDate"),
          maxRecords: t("exportModal.maxRecords"),
          maxRecordsHint: t("exportModal.maxRecordsHint"),
          reset: t("exportModal.reset"),
          cancel: t("actions.cancel"),
          confirm: t("actions.export"),
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

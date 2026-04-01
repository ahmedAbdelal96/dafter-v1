"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Eye } from "lucide-react";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { QueryState } from "@/components/common/QueryState";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table/DataTable";
import type { ColumnDef } from "@/components/ui/data-table/types";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePlatformAuditLogs, usePlatformAuditLookups } from "@/lib/api/hooks/use-platform-audit";
import type {
  PlatformAuditFilters,
  PlatformAuditLogRecord,
} from "@/lib/api/services/platform-audit";
import { platformAuditApi } from "@/lib/api/services/platform-audit";
import { exportWorkbookToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import { PlatformAuditFiltersCard } from "./PlatformAuditFiltersCard";
import { PlatformAuditMetadataModal } from "./PlatformAuditMetadataModal";

function formatDateTime(locale: string, value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function metadataPreview(metadata: Record<string, unknown>) {
  const keys = Object.keys(metadata);
  if (keys.length === 0) return "{}";

  const preview = keys.slice(0, 2).map((key) => `${key}: ${String(metadata[key])}`);
  return `{ ${preview.join(", ")}${keys.length > 2 ? ", ..." : ""} }`;
}

function isHighRiskAction(action: string) {
  const normalized = action.toLowerCase();
  return (
    normalized.includes("suspend") ||
    normalized.includes("disable") ||
    normalized.includes("delete")
  );
}

export function PlatformAuditLogsPageClient() {
  const t = useTranslations("platformAudit");
  const locale = useLocale();
  const { showInfo, showSuccess, handleApiError } = useErrorHandler();

  const [searchInput, setSearchInput] = useState("");
  const [companySearchInput, setCompanySearchInput] = useState("");
  const [actorSearchInput, setActorSearchInput] = useState("");
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [actorUserId, setActorUserId] = useState<string | undefined>(undefined);
  const [action, setAction] = useState<string | undefined>(undefined);
  const [entityType, setEntityType] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "action" | "entityType">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedLog, setSelectedLog] = useState<PlatformAuditLogRecord | null>(null);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const debouncedCompanySearch = useDebouncedValue(companySearchInput, 350);
  const debouncedActorSearch = useDebouncedValue(actorSearchInput, 350);

  const isDateRangeInvalid =
    Boolean(dateFrom && dateTo) && new Date(dateFrom) > new Date(dateTo);

  const lookupsQuery = usePlatformAuditLookups({
    companySearch: debouncedCompanySearch || undefined,
    actorSearch: debouncedActorSearch || undefined,
    companyId,
    limit: 100,
  });

  const filters: PlatformAuditFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      companyId,
      actorUserId,
      action,
      entityType,
      fromDate: dateFrom || undefined,
      toDate: dateTo || undefined,
      sortBy,
      sortOrder,
    }),
    [
      page,
      limit,
      debouncedSearch,
      companyId,
      actorUserId,
      action,
      entityType,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    ],
  );

  const auditQuery = usePlatformAuditLogs(filters, !isDateRangeInvalid);
  const rows = useMemo(() => auditQuery.data?.items ?? [], [auditQuery.data?.items]);
  const meta = auditQuery.data?.meta;

  const companyOptions = useMemo(
    () =>
      (lookupsQuery.data?.companies ?? []).map((company) => ({
        value: company.id,
        label: company.name,
      })),
    [lookupsQuery.data?.companies],
  );

  const actorOptions = useMemo(() => {
    return (lookupsQuery.data?.actors ?? []).map((actor) => ({
      value: actor.id,
      label: actor.fullName || actor.email,
      description: actor.email,
    }));
  }, [lookupsQuery.data?.actors]);

  const actionOptions = useMemo(() => {
    return (lookupsQuery.data?.actions ?? []).map((value) => ({
      value,
      label: value,
    }));
  }, [lookupsQuery.data?.actions]);

  const entityTypeOptions = useMemo(() => {
    return (lookupsQuery.data?.entityTypes ?? []).map((value) => ({
      value,
      label: value,
    }));
  }, [lookupsQuery.data?.entityTypes]);

  const summary = useMemo(() => {
    const companiesCount = new Set(rows.map((item) => item.companyId)).size;
    const actorsCount = new Set(rows.map((item) => item.actorUserId)).size;
    const highRiskCount = rows.filter((item) => isHighRiskAction(item.action)).length;

    return {
      total: meta?.total ?? 0,
      companiesCount,
      actorsCount,
      highRiskCount,
    };
  }, [meta?.total, rows]);

  const handleExportReport = async (scope: ExportScope) => {
    if (isDateRangeInvalid) {
      showInfo(t("messages.exportDateRangeInvalid"));
      return;
    }

    const normalizedScope = {
      fromDate: scope.dateFrom || filters.fromDate,
      toDate: scope.dateTo || filters.toDate,
      maxRecords: scope.maxRecords,
    };

    try {
      setIsExporting(true);

      const allItems = await fetchAllMetaItems(
        async (currentPage, pageSize) => {
          const response = await platformAuditApi.list({
            ...filters,
            page: currentPage,
            limit: pageSize,
            fromDate: normalizedScope.fromDate,
            toDate: normalizedScope.toDate,
          });
          return {
            items: response.items,
            meta: response.meta,
          };
        },
        { maxItems: normalizedScope.maxRecords },
      );

      if (allItems.length === 0) {
        showInfo(t("messages.exportEmpty"));
        return;
      }

      const actionsCounter = new Map<string, number>();
      const entitiesCounter = new Map<string, number>();
      let highRiskCount = 0;

      for (const item of allItems) {
        actionsCounter.set(item.action, (actionsCounter.get(item.action) ?? 0) + 1);
        entitiesCounter.set(item.entityType, (entitiesCounter.get(item.entityType) ?? 0) + 1);
        if (isHighRiskAction(item.action)) highRiskCount += 1;
      }

      const topActions = Array.from(actionsCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const topEntities = Array.from(entitiesCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const summaryRows: Record<string, unknown>[] = [
        {
          [t("export.summary.metric")]: t("export.summary.totalLogs"),
          [t("export.summary.value")]: allItems.length,
        },
        {
          [t("export.summary.metric")]: t("export.summary.uniqueCompanies"),
          [t("export.summary.value")]: new Set(allItems.map((item) => item.companyId)).size,
        },
        {
          [t("export.summary.metric")]: t("export.summary.uniqueActors"),
          [t("export.summary.value")]: new Set(allItems.map((item) => item.actorUserId)).size,
        },
        {
          [t("export.summary.metric")]: t("export.summary.highRiskActions"),
          [t("export.summary.value")]: highRiskCount,
        },
        {
          [t("export.summary.metric")]: t("export.summary.generatedAt"),
          [t("export.summary.value")]: new Date().toISOString(),
        },
        {
          [t("export.summary.metric")]: t("export.summary.appliedDateRange"),
          [t("export.summary.value")]: `${normalizedScope.fromDate ?? "-"} -> ${normalizedScope.toDate ?? "-"}`,
        },
      ];

      for (const [actionName, count] of topActions) {
        summaryRows.push({
          [t("export.summary.metric")]: t("export.summary.topAction", { action: actionName }),
          [t("export.summary.value")]: count,
        });
      }

      for (const [entityName, count] of topEntities) {
        summaryRows.push({
          [t("export.summary.metric")]: t("export.summary.topEntity", { entity: entityName }),
          [t("export.summary.value")]: count,
        });
      }

      const detailsRows = allItems.map((item) => ({
        [t("export.details.createdAt")]: item.createdAt,
        [t("export.details.action")]: item.action,
        [t("export.details.entityType")]: item.entityType,
        [t("export.details.entityId")]: item.entityId ?? "-",
        [t("export.details.company")]: item.company?.name ?? "-",
        [t("export.details.companyId")]: item.companyId,
        [t("export.details.actor")]: item.actorUser?.fullName || item.actorUser?.email || "-",
        [t("export.details.actorEmail")]: item.actorUser?.email ?? "-",
        [t("export.details.actorId")]: item.actorUserId,
        [t("export.details.metadata")]: JSON.stringify(item.metadata),
      }));

      await exportWorkbookToExcel({
        locale,
        filePrefix: t("export.filePrefix"),
        sheets: [
          {
            sheetName: t("export.summary.sheetName"),
            rows: summaryRows,
            columnWidths: [42, 26],
          },
          {
            sheetName: t("export.details.sheetName"),
            rows: detailsRows,
            columnWidths: [22, 24, 20, 38, 22, 38, 24, 26, 38, 50],
          },
        ],
      });

      showSuccess(t("messages.exportSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  const columns = useMemo<ColumnDef<PlatformAuditLogRecord>[]>(
    () => [
      {
        id: "createdAt",
        header: t("table.createdAt"),
        accessor: (row) => row.createdAt,
        width: "170px",
        cell: (row) => (
          <span className="text-sm text-text-secondary dark:text-slate-300">
            {formatDateTime(locale, row.createdAt)}
          </span>
        ),
      },
      {
        id: "action",
        header: t("table.action"),
        accessor: (row) => row.action,
        width: "170px",
        cell: (row) => (
          <code className="inline-flex max-w-[150px] truncate rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
            {row.action}
          </code>
        ),
      },
      {
        id: "company",
        header: t("table.company"),
        accessor: (row) => row.company?.name || "",
        width: "220px",
        cell: (row) => (
          <div className="max-w-[210px]">
            <p className="truncate font-medium text-text-primary dark:text-white">
              {row.company?.name || t("table.unknownCompany")}
            </p>
            <p className="truncate text-[11px] text-text-secondary dark:text-slate-400">
              {row.companyId}
            </p>
          </div>
        ),
      },
      {
        id: "actor",
        header: t("table.actor"),
        accessor: (row) => row.actorUser?.fullName || row.actorUser?.email || "",
        width: "220px",
        cell: (row) => (
          <div className="max-w-[210px]">
            <p className="truncate font-medium text-text-primary dark:text-white">
              {row.actorUser?.fullName || t("table.unknownActor")}
            </p>
            <p className="truncate text-[11px] text-text-secondary dark:text-slate-400">
              {row.actorUser?.email || row.actorUserId}
            </p>
          </div>
        ),
      },
      {
        id: "entity",
        header: t("table.entity"),
        accessor: (row) => row.entityType,
        width: "200px",
        cell: (row) => (
          <div className="max-w-[190px]">
            <p className="truncate font-medium text-text-primary dark:text-white">{row.entityType}</p>
            <p className="truncate text-[11px] text-text-secondary dark:text-slate-400">
              {row.entityId || "-"}
            </p>
          </div>
        ),
      },
      {
        id: "metadataPreview",
        header: t("table.metadata"),
        accessor: (row) => row.metadata,
        width: "280px",
        cell: (row) => (
          <span className="line-clamp-1 block max-w-[260px] text-xs text-text-secondary dark:text-slate-300">
            {metadataPreview(row.metadata)}
          </span>
        ),
      },
    ],
    [locale, t],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border-light/90 bg-white/92 p-6 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/88">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-primary-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("eyebrow")}
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-text-primary dark:text-white">
              {t("heading")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary dark:text-slate-300">
              {t("subheading")}
            </p>
          </div>
          <Button
            variant="outline"
            startIcon={<Download className="h-4 w-4" />}
            onClick={() => setIsExportScopeOpen(true)}
            disabled={isExporting}
          >
            {isExporting ? t("actions.exporting") : t("actions.exportReport")}
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border-light/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-surface-secondary/90">
          <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
            {t("cards.total.title")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white">
            {summary.total}
          </p>
          <p className="mt-1 text-xs text-text-secondary">{t("cards.total.description")}</p>
        </div>
        <div className="rounded-2xl border border-border-light/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-surface-secondary/90">
          <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
            {t("cards.companies.title")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white">
            {summary.companiesCount}
          </p>
          <p className="mt-1 text-xs text-text-secondary">{t("cards.companies.description")}</p>
        </div>
        <div className="rounded-2xl border border-border-light/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-surface-secondary/90">
          <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
            {t("cards.actors.title")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white">
            {summary.actorsCount}
          </p>
          <p className="mt-1 text-xs text-text-secondary">{t("cards.actors.description")}</p>
        </div>
        <div className="rounded-2xl border border-border-light/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-surface-secondary/90">
          <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
            {t("cards.highRisk.title")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white">
            {summary.highRiskCount}
          </p>
          <p className="mt-1 text-xs text-text-secondary">{t("cards.highRisk.description")}</p>
        </div>
      </section>

      <PlatformAuditFiltersCard
        search={searchInput}
        companyId={companyId}
        actorUserId={actorUserId}
        action={action}
        entityType={entityType}
        sortBy={sortBy}
        sortOrder={sortOrder}
        limit={limit}
        dateFrom={dateFrom}
        dateTo={dateTo}
        companyOptions={companyOptions}
        actorOptions={actorOptions}
        actionOptions={actionOptions}
        entityTypeOptions={entityTypeOptions}
        companiesLoading={lookupsQuery.isLoading || lookupsQuery.isFetching}
        actorsLoading={lookupsQuery.isLoading || lookupsQuery.isFetching}
        onSearchChange={(value) => {
          setSearchInput(value);
          setPage(1);
        }}
        onCompanySearchChange={setCompanySearchInput}
        onActorSearchChange={setActorSearchInput}
        onCompanyChange={(value) => {
          setCompanyId(value);
          setActorSearchInput("");
          setActorUserId(undefined);
          setPage(1);
        }}
        onActorChange={(value) => {
          setActorUserId(value);
          setPage(1);
        }}
        onActionChange={(value) => {
          setAction(value);
          setPage(1);
        }}
        onEntityTypeChange={(value) => {
          setEntityType(value);
          setPage(1);
        }}
        onSortByChange={(value) => {
          setSortBy(value);
          setPage(1);
        }}
        onSortOrderChange={(value) => {
          setSortOrder(value);
          setPage(1);
        }}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(1);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(1);
        }}
        onReset={() => {
          setSearchInput("");
          setCompanySearchInput("");
          setActorSearchInput("");
          setCompanyId(undefined);
          setActorUserId(undefined);
          setAction(undefined);
          setEntityType(undefined);
          setDateFrom("");
          setDateTo("");
          setSortBy("createdAt");
          setSortOrder("desc");
          setLimit(20);
          setPage(1);
        }}
      />

      {isDateRangeInvalid ? (
        <div className="rounded-2xl border border-warning-300 bg-warning-50 px-4 py-3 text-sm text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200">
          {t("dateRangeInvalid")}
        </div>
      ) : null}

      <QueryState
        isLoading={auditQuery.isLoading}
        isError={auditQuery.isError}
        errorMessage={auditQuery.error?.message}
        isEmpty={!auditQuery.isLoading && rows.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
      >
        <DataTable
          data={rows}
          columns={columns}
          size="sm"
          getRowId={(row) => row.id}
          pagination={
            meta
              ? {
                  page: meta.page,
                  limit: meta.limit,
                  total: meta.total,
                  totalPages: meta.totalPages,
                  hasNextPage: meta.hasNext,
                  hasPrevPage: meta.hasPrev,
                }
              : undefined
          }
          onPageChange={setPage}
          rowActions={(row) => (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:bg-surface hover:text-text-primary dark:border-border-strong dark:bg-surface-secondary dark:text-slate-300"
              onClick={() => setSelectedLog(row)}
              title={t("actions.viewMetadata")}
              aria-label={t("actions.viewMetadata")}
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          ariaLabel={t("tableAriaLabel")}
          caption={t("tableCaption")}
        />
      </QueryState>

      <PlatformAuditMetadataModal
        open={Boolean(selectedLog)}
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />

      <ExportScopeModal
        open={isExportScopeOpen}
        loading={isExporting}
        showDateRange
        labels={{
          title: t("exportModal.title"),
          description: t("exportModal.description", { total: meta?.total ?? 0 }),
          fromDate: t("filters.dateFrom"),
          toDate: t("filters.dateTo"),
          maxRecords: t("exportModal.maxRecords"),
          maxRecordsHint: t("exportModal.maxRecordsHint"),
          reset: t("exportModal.reset"),
          cancel: t("exportModal.cancel"),
          confirm: t("exportModal.confirm"),
        }}
        initialScope={{
          dateFrom: filters.fromDate,
          dateTo: filters.toDate,
          maxRecords: 5000,
        }}
        onClose={() => setIsExportScopeOpen(false)}
        onConfirm={(scope) => {
          setIsExportScopeOpen(false);
          void handleExportReport(scope);
        }}
      />
    </div>
  );
}

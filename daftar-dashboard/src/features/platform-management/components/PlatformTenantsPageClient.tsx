"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Archive, Eye, Pencil, PlusCircle, Power, Trash2 } from "lucide-react";
import { QueryState } from "@/components/common/QueryState";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table/DataTable";
import type { ColumnDef } from "@/components/ui/data-table/types";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { usePlatformCapabilities, usePlatformCompanies, usePlatformPlans } from "@/lib/api/hooks/use-platform";
import type { PlatformCompaniesFilters, PlatformCompanyListItem } from "@/lib/api/services/platform";
import { CreatePlatformCompanyModal } from "./CreatePlatformCompanyModal";
import { EditPlatformCompanyModal } from "./EditPlatformCompanyModal";
import { ArchivePlatformCompanyModal } from "./ArchivePlatformCompanyModal";
import { DeletePlatformCompanyModal } from "./DeletePlatformCompanyModal";
import { RestorePlatformCompanyModal } from "./RestorePlatformCompanyModal";
import {
  PlatformFiltersCard,
  type PlatformActiveFilter,
  type PlatformArchivedMode,
  type PlatformSortBy,
  type PlatformSortOrder,
  type PlatformSubscriptionFilter,
} from "./PlatformFiltersCard";
import { PlatformStatusBadge } from "./PlatformStatusBadge";
import { ToggleCompanyStateModal } from "./ToggleCompanyStateModal";
import { formatPlatformDate, formatPlanLabel } from "../utils/platform-format";

function toActiveFilterValue(value: PlatformActiveFilter) {
  if (value === "all") return undefined;
  return value === "active";
}

function toSubscriptionStatusValue(value: PlatformSubscriptionFilter) {
  return value === "all" ? undefined : value;
}

function toArchivedFlags(mode: PlatformArchivedMode) {
  switch (mode) {
    case "includeArchived":
      return { includeArchived: true, archivedOnly: undefined };
    case "archivedOnly":
      return { includeArchived: undefined, archivedOnly: true };
    default:
      return { includeArchived: false, archivedOnly: undefined };
  }
}

export function PlatformTenantsPageClient() {
  const t = useTranslations("platformManagement.tenants");
  const locale = useLocale();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<PlatformSubscriptionFilter>("all");
  const [activeFilter, setActiveFilter] = useState<PlatformActiveFilter>("all");
  const [sortBy, setSortBy] = useState<PlatformSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<PlatformSortOrder>("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [archivedMode, setArchivedMode] = useState<PlatformArchivedMode>("activeOnly");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlatformCompanyListItem | null>(null);
  const [toggleTarget, setToggleTarget] = useState<PlatformCompanyListItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PlatformCompanyListItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<PlatformCompanyListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformCompanyListItem | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const archivedFlags = useMemo(() => toArchivedFlags(archivedMode), [archivedMode]);
  const filters: PlatformCompaniesFilters = useMemo(() => ({
    page,
    limit,
    search: debouncedSearch || undefined,
    isActive: toActiveFilterValue(activeFilter),
    includeArchived: archivedFlags.includeArchived,
    archivedOnly: archivedFlags.archivedOnly,
    subscriptionStatus: toSubscriptionStatusValue(subscriptionStatus),
    sortBy,
    sortOrder,
  }), [page, limit, debouncedSearch, activeFilter, archivedFlags, subscriptionStatus, sortBy, sortOrder]);

  const companiesQuery = usePlatformCompanies(filters);
  const plansQuery = usePlatformPlans(true);
  const capabilitiesQuery = usePlatformCapabilities();
  const companies = companiesQuery.data?.items ?? [];
  const meta = companiesQuery.data?.meta;
  const canHardDeleteCompany = capabilitiesQuery.data?.canHardDeleteCompany ?? false;

  const columns = useMemo<ColumnDef<PlatformCompanyListItem>[]>(() => [
    {
      id: "company",
      header: t("table.company"),
      accessor: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="font-medium text-text-primary dark:text-white">{row.name}</p>
          <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">{row.phone || row.address || "-"}</p>
        </div>
      ),
    },
    {
      id: "usersCount",
      header: t("table.users"),
      accessor: (row) => row.usersCount,
      align: "center",
      cell: (row) => <span className="font-medium text-text-primary dark:text-white">{row.usersCount}</span>,
    },
    {
      id: "subscription",
      header: t("table.subscription"),
      accessor: (row) => row.latestSubscription?.status ?? "-",
      cell: (row) => row.latestSubscription ? <PlatformStatusBadge status={row.latestSubscription.status} /> : <span className="text-sm text-text-secondary dark:text-slate-400">{t("status.none")}</span>,
    },
    {
      id: "plan",
      header: t("table.plan"),
      accessor: (row) => row.latestSubscription?.plan?.name ?? "-",
      cell: (row) => <span className="text-sm text-text-primary dark:text-white">{formatPlanLabel(row.latestSubscription?.plan?.name, row.latestSubscription?.plan?.billingCycle)}</span>,
    },
    {
      id: "isActive",
      header: t("table.workspaceState"),
      accessor: (row) => row.isActive,
      cell: (row) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.isDeleted ? "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300" : row.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300" : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300"}`}>
          {row.isDeleted ? t("archived") : row.isActive ? t("active") : t("inactive")}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: t("table.createdAt"),
      accessor: (row) => row.createdAt,
      cell: (row) => <span className="text-sm text-text-secondary dark:text-slate-300">{formatPlatformDate(locale, row.createdAt)}</span>,
    },
  ], [locale, t]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border-light/90 bg-white/92 p-6 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/88">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-primary-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-text-primary dark:text-white">{t("heading")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subheading")}</p>
          </div>
          <Button startIcon={<PlusCircle className="h-4 w-4" />} onClick={() => setCreateModalOpen(true)} disabled={plansQuery.isLoading || plansQuery.isError}>
            {t("actions.create")}
          </Button>
        </div>
      </section>

      <PlatformFiltersCard
        search={search}
        subscriptionStatus={subscriptionStatus}
        activeFilter={activeFilter}
        limit={limit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        showSortControls
        archivedMode={archivedMode}
        showArchivedModeFilter
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        onSubscriptionStatusChange={(value) => { setSubscriptionStatus(value); setPage(1); }}
        onActiveFilterChange={(value) => { setActiveFilter(value); setPage(1); }}
        onArchivedModeChange={(value) => { setArchivedMode(value); setPage(1); }}
        onLimitChange={(value) => { setLimit(value); setPage(1); }}
        onSortByChange={(value) => {
          setSortBy(value);
          setPage(1);
        }}
        onSortOrderChange={(value) => {
          setSortOrder(value);
          setPage(1);
        }}
        onReset={() => {
          setSearch("");
          setSubscriptionStatus("all");
          setActiveFilter("all");
          setArchivedMode("activeOnly");
          setSortBy("createdAt");
          setSortOrder("desc");
          setLimit(10);
          setPage(1);
        }}
      />

      <QueryState
        isLoading={companiesQuery.isLoading}
        isError={companiesQuery.isError}
        errorMessage={companiesQuery.error?.message}
        errorAction={{
          label: t("empty.retry"),
          onClick: () => {
            void companiesQuery.refetch();
          },
        }}
        isEmpty={!companiesQuery.isLoading && companies.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={{
          label:
            debouncedSearch || subscriptionStatus !== "all" || activeFilter !== "all" || archivedMode !== "activeOnly"
              ? t("filters.reset")
              : t("actions.create"),
          onClick: () => {
            if (debouncedSearch || subscriptionStatus !== "all" || activeFilter !== "all" || archivedMode !== "activeOnly") {
              setSearch("");
              setSubscriptionStatus("all");
              setActiveFilter("all");
              setArchivedMode("activeOnly");
              setSortBy("createdAt");
              setSortOrder("desc");
              setLimit(10);
              setPage(1);
              return;
            }
            setCreateModalOpen(true);
          },
        }}
      >
        <DataTable
          data={companies}
          columns={columns}
          size="sm"
          getRowId={(row) => row.id}
          pagination={meta ? { page: meta.page, limit: meta.limit, total: meta.total, totalPages: meta.totalPages, hasNextPage: meta.hasNext, hasPrevPage: meta.hasPrev } : undefined}
          onPageChange={setPage}
          rowActions={(row) => (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:bg-surface hover:text-text-primary dark:border-border-strong dark:bg-surface-secondary dark:text-slate-300"
                  onClick={() => router.push(`/${locale}/super-admin/tenants/${row.id}`)}
                  title={t("actions.view")}
                  aria-label={t("actions.view")}
                >
                  <Eye className="h-4 w-4" />
                </button>
                {!row.isDeleted ? (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:bg-surface hover:text-text-primary dark:border-border-strong dark:bg-surface-secondary dark:text-slate-300"
                    onClick={() => setEditTarget(row)}
                    title={t("actions.edit")}
                    aria-label={t("actions.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="h-6 w-px bg-border-light dark:bg-border-strong" />
              <div className="flex items-center gap-1">
                {!row.isDeleted ? (
                  <>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:bg-surface hover:text-text-primary dark:border-border-strong dark:bg-surface-secondary dark:text-slate-300"
                      onClick={() => setArchiveTarget(row)}
                      title={t("actions.archive")}
                      aria-label={t("actions.archive")}
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                        row.isActive
                          ? "border-error-200 bg-error-50 text-error-600 hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
                          : "border-success-200 bg-success-50 text-success-600 hover:bg-success-100 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300"
                      }`}
                      onClick={() => setToggleTarget(row)}
                      title={row.isActive ? t("actions.disable") : t("actions.enable")}
                      aria-label={row.isActive ? t("actions.disable") : t("actions.enable")}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-success-200 bg-success-50 text-success-600 transition hover:bg-success-100 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300"
                    onClick={() => setRestoreTarget(row)}
                    title={t("actions.restore")}
                    aria-label={t("actions.restore")}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                )}
                {canHardDeleteCompany ? (
                  <>
                    <div className="mx-1 h-5 w-px bg-error-100 dark:bg-error-500/20" />
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-error-200 bg-error-50 text-error-600 transition hover:bg-error-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
                      disabled={row.isActive && !row.isDeleted}
                      onClick={() => setDeleteTarget(row)}
                      title={t("actions.delete")}
                      aria-label={t("actions.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}
          ariaLabel={t("tableAriaLabel")}
          caption={t("tableCaption")}
        />
      </QueryState>

      <CreatePlatformCompanyModal open={createModalOpen} plans={plansQuery.data ?? []} onClose={() => setCreateModalOpen(false)} />
      <EditPlatformCompanyModal key={editTarget?.id ?? "tenant-edit-none"} company={editTarget} open={Boolean(editTarget)} onClose={() => setEditTarget(null)} />
      <ToggleCompanyStateModal company={toggleTarget} open={Boolean(toggleTarget)} onClose={() => setToggleTarget(null)} />
      <ArchivePlatformCompanyModal key={archiveTarget?.id ?? "tenant-archive-none"} company={archiveTarget} open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} />
      <RestorePlatformCompanyModal key={restoreTarget?.id ?? "tenant-restore-none"} company={restoreTarget} open={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)} />
      {canHardDeleteCompany ? (
        <DeletePlatformCompanyModal
          key={deleteTarget?.id ?? "tenant-delete-none"}
          company={deleteTarget}
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}


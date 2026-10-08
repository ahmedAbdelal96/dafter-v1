"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, Power } from "lucide-react";
import { QueryState } from "@/components/common/QueryState";
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { DataTable } from "@/components/ui/data-table/DataTable";
import type { ColumnDef } from "@/components/ui/data-table/types";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  useCreatePlatformPlan,
  type PlatformPlanUsage,
  usePlatformPlansUsage,
  usePlatformPlans,
  useUpdatePlatformPlan,
} from "@/lib/api/hooks/use-platform";
import { useFeatureCatalog } from "@/lib/api/hooks/use-entitlements";
import type {
  CreatePlatformPlanRequest,
  PlatformPlan,
  UpdatePlatformPlanRequest,
} from "@/lib/api/services/platform";
import { PlanFormModal } from "./PlanFormModal";
import { findUnknownFeatureKeys } from "../utils/feature-catalog";

type StatusFilter = "all" | "active" | "inactive";
type CycleFilter = "all" | "MONTHLY" | "YEARLY";

export function PlatformPlansPageClient() {
  const t = useTranslations("platformManagement.plansManagement");
  const locale = useLocale();
  const { handleApiError, showSuccess, showWarning } = useErrorHandler();

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlatformPlan | null>(null);

  const search = useDebouncedValue(searchInput, 300);
  const plansQuery = usePlatformPlans(true);
  const plansUsageQuery = usePlatformPlansUsage(true);
  const featureCatalogQuery = useFeatureCatalog(true);
  const createMutation = useCreatePlatformPlan();
  const updateMutation = useUpdatePlatformPlan();

  const allPlans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const filteredPlans = useMemo(() => {
    return allPlans.filter((plan) => {
      const matchesSearch =
        !search ||
        plan.name.toLowerCase().includes(search.toLowerCase()) ||
        plan.currencyCode.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? plan.isActive : !plan.isActive);
      const matchesCycle =
        cycleFilter === "all" || plan.billingCycle === cycleFilter;

      return matchesSearch && matchesStatus && matchesCycle;
    });
  }, [allPlans, search, statusFilter, cycleFilter]);

  const stats = useMemo(
    () => ({
      total: allPlans.length,
      active: allPlans.filter((plan) => plan.isActive).length,
      monthly: allPlans.filter((plan) => plan.billingCycle === "MONTHLY").length,
      assigned: allPlans.filter((plan) => {
        const usage = (plansUsageQuery.data ?? []).find((item) => item.planId === plan.id);
        return Boolean((usage?.totalTenants ?? 0) > 0);
      }).length,
    }),
    [allPlans, plansUsageQuery.data],
  );

  const usageByPlanId = useMemo(() => {
    const map = new Map<string, PlatformPlanUsage>();
    for (const usage of plansUsageQuery.data ?? []) {
      map.set(usage.planId, usage);
    }
    return map;
  }, [plansUsageQuery.data]);

  const columns = useMemo<ColumnDef<PlatformPlan>[]>(
    () => [
      {
        id: "name",
        header: t("table.name"),
        accessor: (row) => row.name,
        cell: (row) => (
          <div>
            <p className="font-medium text-text-primary dark:text-white">{row.name}</p>
            <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">
              {t(`billingCycle.${row.billingCycle}`)}
            </p>
          </div>
        ),
      },
      {
        id: "price",
        header: t("table.price"),
        accessor: (row) => row.price,
        cell: (row) =>
          new Intl.NumberFormat(locale, {
            style: "currency",
            currency: row.currencyCode || "EGP",
            maximumFractionDigits: 2,
          }).format(row.price ?? 0),
      },
      {
        id: "limits",
        header: t("table.capacity"),
        accessor: (row) => row.id,
        cell: (row) => {
          const users = row.maxUsers ?? t("unlimited");
          const customers = row.maxCustomers ?? t("unlimited");
          return t("capacitySummary", { users, customers });
        },
      },
      {
        id: "features",
        header: t("table.features"),
        accessor: (row) => row.features.length,
        cell: (row) => String(row.features.length),
      },
      {
        id: "assignedTenants",
        header: t("table.assignedTenants"),
        accessor: (row) => usageByPlanId.get(row.id)?.totalTenants ?? 0,
        cell: (row) => {
          const usage = usageByPlanId.get(row.id);
          if (!usage) {
            return (
              <span className="text-sm text-text-secondary dark:text-slate-400">
                {t("table.assignedEmpty")}
              </span>
            );
          }

          return (
            <div className="text-sm text-text-primary dark:text-white">
              <p>{t("table.assignedSummary", { count: usage.totalTenants })}</p>
              <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">
                {t("table.assignedSubSummary", {
                  active: usage.activeWorkspaces,
                  archived: usage.archivedWorkspaces,
                })}
              </p>
            </div>
          );
        },
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row) => row.isActive,
        cell: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              row.isActive
                ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300"
                : "bg-surface-tertiary text-text-secondary dark:bg-white/[0.05] dark:text-slate-300"
            }`}
          >
            {row.isActive ? t("active") : t("inactive")}
          </span>
        ),
      },
    ],
    [locale, t, usageByPlanId],
  );

  const statusOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.status.all") },
      { value: "active", label: t("filters.status.active") },
      { value: "inactive", label: t("filters.status.inactive") },
    ],
    [t],
  );

  const cycleOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.cycle.all") },
      { value: "MONTHLY", label: t("billingCycle.MONTHLY") },
      { value: "YEARLY", label: t("billingCycle.YEARLY") },
    ],
    [t],
  );

  const isMutating = createMutation.isPending || updateMutation.isPending;
  const featureCatalog = featureCatalogQuery.data?.features ?? [];

  const validateFeatureKeys = (
    payload: CreatePlatformPlanRequest | UpdatePlatformPlanRequest,
  ): boolean => {
    const unknownFeatures = findUnknownFeatureKeys(payload.features, featureCatalog);
    if (unknownFeatures.length === 0) {
      return true;
    }

    showWarning(
      t("messages.invalidFeatures", {
        features: unknownFeatures.join(", "),
      }),
    );
    return false;
  };

  const handleCreate = async (payload: CreatePlatformPlanRequest) => {
    if (!validateFeatureKeys(payload)) {
      return;
    }

    try {
      await createMutation.mutateAsync(payload);
      showSuccess(t("messages.createSuccess"));
      setIsCreateOpen(false);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleEdit = async (payload: UpdatePlatformPlanRequest) => {
    if (!editTarget) return;
    if (!validateFeatureKeys(payload)) {
      return;
    }

    try {
      await updateMutation.mutateAsync({ planId: editTarget.id, payload });
      showSuccess(t("messages.updateSuccess"));
      setEditTarget(null);
    } catch (error) {
      handleApiError(error, t("messages.updateError"));
    }
  };

  const handleTogglePlanState = async (plan: PlatformPlan) => {
    try {
      await updateMutation.mutateAsync({
        planId: plan.id,
        payload: { isActive: !plan.isActive },
      });
      showSuccess(
        plan.isActive ? t("messages.disableSuccess") : t("messages.enableSuccess"),
      );
    } catch (error) {
      handleApiError(error, t("messages.toggleError"));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border-light/90 bg-white/92 p-6 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/88">
        <span className="inline-flex rounded-full bg-primary-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("eyebrow")}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-text-primary dark:text-white">
          {t("heading")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary dark:text-slate-300">
          {t("subheading")}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <ComponentCard title={t("cards.total.title")} desc={t("cards.total.description")}>
          <p className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">
            {stats.total}
          </p>
        </ComponentCard>
        <ComponentCard title={t("cards.active.title")} desc={t("cards.active.description")}>
          <p className="text-3xl font-bold tracking-tight text-success-700 dark:text-success-300">
            {stats.active}
          </p>
        </ComponentCard>
        <ComponentCard title={t("cards.monthly.title")} desc={t("cards.monthly.description")}>
          <p className="text-3xl font-bold tracking-tight text-primary">{stats.monthly}</p>
        </ComponentCard>
        <ComponentCard title={t("cards.assigned.title")} desc={t("cards.assigned.description")}>
          <p className="text-3xl font-bold tracking-tight text-brand-700 dark:text-brand-300">
            {stats.assigned}
          </p>
        </ComponentCard>
      </section>

      <ComponentCard title={t("filters.title")} desc={t("filters.description")}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("filters.search")}
          />
          <Combobox
            value={statusFilter}
            options={statusOptions}
            searchable={false}
            placeholder={t("filters.status.placeholder")}
            onChange={(value) => setStatusFilter((value as StatusFilter | undefined) ?? "all")}
          />
          <Combobox
            value={cycleFilter}
            options={cycleOptions}
            searchable={false}
            placeholder={t("filters.cycle.placeholder")}
            onChange={(value) => setCycleFilter((value as CycleFilter | undefined) ?? "all")}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSearchInput("");
                setStatusFilter("all");
                setCycleFilter("all");
              }}
            >
              {t("filters.reset")}
            </Button>
            <Button startIcon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
              {t("actions.create")}
            </Button>
          </div>
        </div>
      </ComponentCard>

      <QueryState
        isLoading={plansQuery.isLoading || plansUsageQuery.isLoading}
        isError={plansQuery.isError || plansUsageQuery.isError}
        errorMessage={plansQuery.error?.message ?? plansUsageQuery.error?.message}
        isEmpty={!plansQuery.isLoading && filteredPlans.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={{
          label: t("actions.create"),
          onClick: () => setIsCreateOpen(true),
        }}
      >
        <DataTable
          data={filteredPlans}
          columns={columns}
          size="sm"
          getRowId={(row) => row.id}
          rowActions={(row) => (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:bg-surface hover:text-text-primary dark:border-border-strong dark:bg-surface-secondary dark:text-slate-300"
                onClick={() => setEditTarget(row)}
                title={t("actions.edit")}
                aria-label={t("actions.edit")}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  row.isActive
                    ? "border-error-200 bg-error-50 text-error-600 hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
                    : "border-success-200 bg-success-50 text-success-600 hover:bg-success-100 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300"
                }`}
                onClick={() => void handleTogglePlanState(row)}
                disabled={updateMutation.isPending}
                title={row.isActive ? t("actions.deactivate") : t("actions.activate")}
                aria-label={row.isActive ? t("actions.deactivate") : t("actions.activate")}
              >
                <Power className="h-4 w-4" />
              </button>
            </div>
          )}
          ariaLabel={t("tableAriaLabel")}
          caption={t("tableCaption")}
        />
      </QueryState>

      <PlanFormModal
        open={isCreateOpen}
        loading={isMutating}
        mode="create"
        plan={null}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <PlanFormModal
        open={Boolean(editTarget)}
        loading={isMutating}
        mode="edit"
        plan={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
      />
    </div>
  );
}

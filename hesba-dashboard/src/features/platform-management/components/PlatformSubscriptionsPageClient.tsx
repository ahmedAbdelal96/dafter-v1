"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Eye,
  History,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  Shuffle,
} from "lucide-react";
import { QueryState } from "@/components/common/QueryState";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { DataTable } from "@/components/ui/data-table/DataTable";
import type { ColumnDef } from "@/components/ui/data-table/types";
import Input from "@/components/form/input/InputField";
import { Modal } from "@/components/ui/modal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  useActivatePlatformSubscription,
  useChangePlatformSubscriptionPlan,
  useExtendPlatformSubscription,
  usePlatformCompanies,
  usePlatformPlans,
  useSuspendPlatformSubscription,
} from "@/lib/api/hooks/use-platform";
import type {
  ActivatePlatformSubscriptionRequest,
  ChangePlatformSubscriptionPlanRequest,
  ExtendPlatformSubscriptionRequest,
  PlatformCompaniesFilters,
  PlatformCompanyListItem,
  PlatformPlan,
  SuspendPlatformSubscriptionRequest,
} from "@/lib/api/services/platform";
import { PlatformCompanyDetailsModal } from "./PlatformCompanyDetailsModal";
import {
  PlatformFiltersCard,
  type PlatformActiveFilter,
  type PlatformSubscriptionFilter,
} from "./PlatformFiltersCard";
import { PlatformStatusBadge } from "./PlatformStatusBadge";
import { SubscriptionTimelineModal } from "./SubscriptionTimelineModal";
import {
  formatPlatformDate,
  formatPlanLabel,
  formatRelativeDays,
} from "../utils/platform-format";

type MutationMode = "activate" | "changePlan" | "extend" | "suspend";

type SubscriptionModalState =
  | { mode: MutationMode; company: PlatformCompanyListItem }
  | null;

type ActionRecord = {
  mode: MutationMode;
  companyName: string;
  reason: string;
  createdAt: string;
};

function toActiveFilterValue(value: PlatformActiveFilter) {
  if (value === "all") return undefined;
  return value === "active";
}

function toSubscriptionStatusValue(value: PlatformSubscriptionFilter) {
  return value === "all" ? undefined : value;
}

function PlanCard({
  plan,
  locale,
  t,
}: {
  plan: PlatformPlan;
  locale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <article className="rounded-2xl border border-border-light/80 bg-surface/60 p-4 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary dark:text-white">
            {plan.name}
          </h3>
          <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">
            {formatPlanLabel(plan.name, plan.billingCycle)}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            plan.isActive
              ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300"
              : "bg-surface-tertiary text-text-secondary dark:bg-white/[0.05] dark:text-slate-300"
          }`}
        >
          {plan.isActive ? t("plans.active") : t("plans.inactive")}
        </span>
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight text-text-primary dark:text-white">
        {new Intl.NumberFormat(locale, {
          style: "currency",
          currency: plan.currencyCode || "USD",
          maximumFractionDigits: 0,
        }).format(plan.price || 0)}
      </p>

      <p className="mt-2 text-xs text-text-secondary dark:text-slate-400">
        {t("plans.capacity", {
          users: plan.maxUsers ?? t("plans.unlimited"),
          customers: plan.maxCustomers ?? t("plans.unlimited"),
        })}
      </p>
    </article>
  );
}

function SubscriptionActionContent({
  state,
  plans,
  busy,
  onClose,
  onSubmit,
}: {
  state: NonNullable<SubscriptionModalState>;
  plans: PlatformPlan[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    mode: MutationMode;
    request:
      | ActivatePlatformSubscriptionRequest
      | ChangePlatformSubscriptionPlanRequest
      | ExtendPlatformSubscriptionRequest
      | SuspendPlatformSubscriptionRequest;
    reason: string;
  }) => Promise<void>;
}) {
  const locale = useLocale();
  const t = useTranslations("platformManagement.subscriptions.modal");
  const tActions = useTranslations("platformManagement.subscriptions.actions");
  const tGovernance = useTranslations("platformManagement.subscriptions.governance");

  const currentPlanId = state.company.latestSubscription?.plan?.id ?? "";
  const defaultPlanId = plans[0]?.id ?? "";
  const defaultEndDate =
    state.company.latestSubscription?.endDate?.slice(0, 10) ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const planOptions = useMemo<ComboboxOption[]>(
    () =>
      plans.map((plan) => ({
        value: plan.id,
        label: formatPlanLabel(plan.name, plan.billingCycle),
      })),
    [plans],
  );

  const isActivate = state.mode === "activate";
  const isChangePlan = state.mode === "changePlan";
  const isPlanSelectionMode = isActivate || isChangePlan;
  const requiresDate = isActivate || state.mode === "extend";
  const requiresReason = state.mode === "changePlan" || state.mode === "suspend";
  const currentPlanLabel = formatPlanLabel(
    state.company.latestSubscription?.plan?.name,
    state.company.latestSubscription?.plan?.billingCycle,
  );
  const currentEndDateLabel = formatPlatformDate(
    locale,
    state.company.latestSubscription?.endDate,
  );
  const nextStepTone =
    state.mode === "suspend"
      ? "border-warning-200 bg-warning-50/70 text-warning-900 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-100"
      : "border-primary/15 bg-primary/5 text-text-primary dark:border-primary/25 dark:bg-primary/10 dark:text-white";
  const actionSchema = useMemo(
    () =>
      z
        .object({
          planId: z.string(),
          dateValue: z.string(),
          reason: z.string(),
          autoRenew: z.boolean(),
          confirmed: z.boolean(),
        })
        .superRefine((values, ctx) => {
          const reasonTrimmed = values.reason.trim();
          const isSamePlan =
            state.mode === "changePlan" &&
            Boolean(currentPlanId) &&
            currentPlanId === values.planId;

          if (isPlanSelectionMode && !values.planId) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["planId"],
              message: t("validation.planRequired"),
            });
          }

          if (requiresDate && !values.dateValue) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["dateValue"],
              message: t("validation.dateRequired"),
            });
          }

          if (requiresDate && values.dateValue && values.dateValue < today) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["dateValue"],
              message: t("validation.dateMustBeFuture"),
            });
          }

          if (requiresReason && reasonTrimmed.length < 3) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["reason"],
              message: t("validation.reasonMin"),
            });
          }

          if (!values.confirmed) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["confirmed"],
              message: t("validation.confirmRequired"),
            });
          }

          if (isSamePlan) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["planId"],
              message: t("samePlanWarning"),
            });
          }
        }),
    [currentPlanId, isPlanSelectionMode, requiresDate, requiresReason, state.mode, t, today],
  );

  type SubscriptionActionFormValues = z.infer<typeof actionSchema>;
  const form = useForm<SubscriptionActionFormValues>({
    resolver: zodResolver(actionSchema),
    mode: "onChange",
    defaultValues: {
      planId: defaultPlanId,
      dateValue: defaultEndDate,
      reason: "",
      autoRenew: state.company.latestSubscription?.autoRenew ?? true,
      confirmed: false,
    },
  });

  const planId = form.watch("planId");
  const autoRenew = form.watch("autoRenew");
  const confirmed = form.watch("confirmed");
  const isSamePlan =
    state.mode === "changePlan" &&
    Boolean(currentPlanId) &&
    currentPlanId === planId;

  const isSubmitDisabled =
    busy ||
    form.formState.isSubmitting ||
    !form.formState.isValid ||
    !confirmed ||
    (isPlanSelectionMode && (!planId || plans.length === 0));

  const handleFormSubmit = async (values: SubscriptionActionFormValues) => {
    const normalizedReason = values.reason.trim();

    if (isActivate) {
      await onSubmit({
        mode: state.mode,
        request: {
          companyId: state.company.id,
          planId: values.planId,
          endDate: values.dateValue,
          autoRenew: values.autoRenew,
          note: normalizedReason || undefined,
        },
        reason: normalizedReason,
      });
      return;
    }

    if (isChangePlan) {
      await onSubmit({
        mode: state.mode,
        request: {
          companyId: state.company.id,
          newPlanId: values.planId,
          mode: "IMMEDIATE",
          reason: normalizedReason || undefined,
        },
        reason: normalizedReason,
      });
      return;
    }

    if (state.mode === "extend") {
      await onSubmit({
        mode: state.mode,
        request: {
          companyId: state.company.id,
          newEndDate: values.dateValue,
          reason: normalizedReason || undefined,
        },
        reason: normalizedReason,
      });
      return;
    }

    await onSubmit({
      mode: state.mode,
      request: {
        companyId: state.company.id,
        reason: normalizedReason || undefined,
      },
      reason: normalizedReason,
    });
  };

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(handleFormSubmit)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("eyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">
          {t(`titles.${state.mode}`)}
        </h2>
        <p className="mt-2 text-sm text-text-secondary dark:text-slate-300">
          {state.company.name}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-light/70 bg-surface-tertiary/70 p-4 text-sm text-text-secondary dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary dark:text-slate-400">
            {t("sections.currentState")}
          </p>
          <p className="mt-3">
            {t("context.currentPlan")}:{" "}
            <span className="font-semibold text-text-primary dark:text-white">
              {currentPlanLabel}
            </span>
          </p>
          <p className="mt-2">
            {t("context.currentEndDate")}:{" "}
            <span className="font-semibold text-text-primary dark:text-white">
              {currentEndDateLabel}
            </span>
          </p>
        </div>

        <div className={`rounded-2xl border p-4 text-sm ${nextStepTone}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
            {t("sections.nextStep")}
          </p>
          <p className="mt-3 font-semibold">{t(`titles.${state.mode}`)}</p>
          <p className="mt-2 text-xs leading-5 opacity-90">
            {t(`guidance.${state.mode}`)}
          </p>
        </div>
      </div>

      {isPlanSelectionMode ? (
        <div className="space-y-3 rounded-2xl border border-border-light/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary dark:text-slate-400">
              {t("sections.setup")}
            </p>
            <p className="mt-2 text-xs text-text-secondary dark:text-slate-400">
              {t("helpers.planAndDate")}
            </p>
          </div>
          <Combobox
            value={planId}
            options={planOptions}
            placeholder={t("plan")}
            searchPlaceholder={t("searchPlan")}
            emptyText={t("emptyPlans")}
            onChange={(value) =>
              form.setValue("planId", value ?? "", {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          {form.formState.errors.planId ? (
            <p className="text-xs text-error-500">{form.formState.errors.planId.message}</p>
          ) : null}

          {isSamePlan ? (
            <p className="text-xs text-warning-700 dark:text-warning-300">
              {t("samePlanWarning")}
            </p>
          ) : null}

          <Input
            type="date"
            min={today}
            placeholder={t("endDate")}
            error={Boolean(form.formState.errors.dateValue)}
            {...form.register("dateValue")}
          />
          {form.formState.errors.dateValue ? (
            <p className="text-xs text-error-500">{form.formState.errors.dateValue.message}</p>
          ) : null}
        </div>
      ) : null}

      {state.mode === "extend" ? (
        <div className="space-y-3 rounded-2xl border border-border-light/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary dark:text-slate-400">
              {t("sections.setup")}
            </p>
            <p className="mt-2 text-xs text-text-secondary dark:text-slate-400">
              {t("helpers.extendDate")}
            </p>
          </div>
          <Input
            type="date"
            min={today}
            placeholder={t("newEndDate")}
            error={Boolean(form.formState.errors.dateValue)}
            {...form.register("dateValue")}
          />
          {form.formState.errors.dateValue ? (
            <p className="text-xs text-error-500">{form.formState.errors.dateValue.message}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-border-light/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary dark:text-slate-400">
            {t("sections.notes")}
          </p>
          <p className="mt-2 text-xs text-text-secondary dark:text-slate-400">
            {t(state.mode === "activate" ? "helpers.noteOptional" : "helpers.reasonOptional")}
          </p>
        </div>

        {state.mode !== "suspend" ? (
          <label className="flex items-center gap-2 text-sm text-text-primary dark:text-white">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(event) =>
                form.setValue("autoRenew", event.target.checked, {
                  shouldDirty: true,
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-primary"
            />
            {t("autoRenew")}
          </label>
        ) : null}

        <textarea
          {...form.register("reason")}
          placeholder={state.mode === "activate" ? t("note") : t("reason")}
          className="min-h-28 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs focus:border-border-focus focus:outline-hidden focus:ring-3 focus:ring-primary/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
        {form.formState.errors.reason ? (
          <p className="text-xs text-error-500">{form.formState.errors.reason.message}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-warning-200 bg-warning-50/60 p-3 text-xs text-warning-800 dark:border-warning-500/25 dark:bg-warning-500/10 dark:text-warning-200">
        <p className="font-semibold">{tGovernance("title")}</p>
        <p className="mt-1">{tGovernance("description")}</p>
        <p className="mt-2">{tGovernance("requiredReason")}</p>
        <p>{tGovernance("requiredConfirm")}</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-primary dark:text-white">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) =>
            form.setValue("confirmed", event.target.checked, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          className="h-4 w-4 rounded border-gray-300 text-primary"
        />
        {t("confirmLabel")}
      </label>
      {form.formState.errors.confirmed ? (
        <p className="text-xs text-error-500">{form.formState.errors.confirmed.message}</p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button variant="danger" type="button" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          variant={state.mode === "suspend" ? "danger" : "primary"}
          disabled={isSubmitDisabled}
        >
          {busy ? t("submitting") : t(`submit.${state.mode}`)}
        </Button>
      </div>

      <p className="text-xs text-text-secondary dark:text-slate-400">
        {tActions(state.mode === "changePlan" ? "changePlan" : state.mode)}
      </p>
    </form>
  );
}

function SubscriptionActionModal({
  state,
  plans,
  busy,
  onClose,
  onSubmit,
}: {
  state: SubscriptionModalState;
  plans: PlatformPlan[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    mode: MutationMode;
    request:
      | ActivatePlatformSubscriptionRequest
      | ChangePlatformSubscriptionPlanRequest
      | ExtendPlatformSubscriptionRequest
      | SuspendPlatformSubscriptionRequest;
    reason: string;
  }) => Promise<void>;
}) {
  if (!state) return null;

  const key = `${state.mode}-${state.company.id}-${state.company.latestSubscription?.id ?? "none"}`;

  return (
    <Modal
      isOpen={Boolean(state)}
      onClose={onClose}
      className="mx-auto w-full max-w-2xl p-6 sm:p-8"
    >
      <SubscriptionActionContent
        key={key}
        state={state}
        plans={plans}
        busy={busy}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}

export function PlatformSubscriptionsPageClient() {
  const t = useTranslations("platformManagement.subscriptions");
  const locale = useLocale();
  const { handleApiError, showSuccess } = useErrorHandler();

  const [search, setSearch] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<PlatformSubscriptionFilter>("all");
  const [activeFilter, setActiveFilter] = useState<PlatformActiveFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [timelineCompanyId, setTimelineCompanyId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<SubscriptionModalState>(null);
  const [actionHistory, setActionHistory] = useState<ActionRecord[]>([]);

  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: PlatformCompaniesFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      isActive: toActiveFilterValue(activeFilter),
      subscriptionStatus: toSubscriptionStatusValue(subscriptionStatus),
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, limit, debouncedSearch, activeFilter, subscriptionStatus],
  );

  const companiesQuery = usePlatformCompanies(filters);
  const plansQuery = usePlatformPlans(true);
  const activateMutation = useActivatePlatformSubscription();
  const changePlanMutation = useChangePlatformSubscriptionPlan();
  const extendMutation = useExtendPlatformSubscription();
  const suspendMutation = useSuspendPlatformSubscription();

  const companies = companiesQuery.data?.items ?? [];
  const meta = companiesQuery.data?.meta;
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);
  const isMutating =
    activateMutation.isPending ||
    changePlanMutation.isPending ||
    extendMutation.isPending ||
    suspendMutation.isPending;

  const activeCompaniesCount = companies.filter(
    (item) => item.latestSubscription?.status === "ACTIVE",
  ).length;
  const expiringSoonCount = companies.filter((item) => {
    const days = formatRelativeDays(item.latestSubscription?.endDate);
    return days !== null && days >= 0 && days <= 14;
  }).length;
  const suspendedCount = companies.filter(
    (item) => item.latestSubscription?.status === "SUSPENDED",
  ).length;

  const columns = useMemo<ColumnDef<PlatformCompanyListItem>[]>(
    () => [
      {
        id: "company",
        header: t("table.company"),
        accessor: (row) => row.name,
        cell: (row) => (
          <div>
            <p className="font-medium text-text-primary dark:text-white">{row.name}</p>
            <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">
              {row.phone || row.address || "-"}
            </p>
          </div>
        ),
      },
      {
        id: "plan",
        header: t("table.plan"),
        accessor: (row) => row.latestSubscription?.plan?.name ?? "-",
        cell: (row) => (
          <span className="text-sm text-text-primary dark:text-white">
            {formatPlanLabel(
              row.latestSubscription?.plan?.name,
              row.latestSubscription?.plan?.billingCycle,
            )}
          </span>
        ),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row) => row.latestSubscription?.status ?? "-",
        cell: (row) =>
          row.latestSubscription ? (
            <PlatformStatusBadge status={row.latestSubscription.status} />
          ) : (
            <span className="text-sm text-text-secondary dark:text-slate-400">
              {t("status.none")}
            </span>
          ),
      },
      {
        id: "endDate",
        header: t("table.endDate"),
        accessor: (row) => row.latestSubscription?.endDate ?? "",
        cell: (row) => {
          const days = formatRelativeDays(row.latestSubscription?.endDate);
          return (
            <div>
              <p className="text-sm text-text-primary dark:text-white">
                {formatPlatformDate(locale, row.latestSubscription?.endDate)}
              </p>
              <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">
                {days === null ? t("status.noExpiry") : t("status.daysLeft", { count: days })}
              </p>
            </div>
          );
        },
      },
      {
        id: "createdAt",
        header: t("table.createdAt"),
        accessor: (row) => row.createdAt,
        cell: (row) => (
          <span className="text-sm text-text-secondary dark:text-slate-300">
            {formatPlatformDate(locale, row.createdAt)}
          </span>
        ),
      },
    ],
    [locale, t],
  );

  const handleMutationSubmit = async (payload: {
    mode: MutationMode;
    request:
      | ActivatePlatformSubscriptionRequest
      | ChangePlatformSubscriptionPlanRequest
      | ExtendPlatformSubscriptionRequest
      | SuspendPlatformSubscriptionRequest;
    reason: string;
  }) => {
    if (!modalState) return;

    try {
      if (payload.mode === "activate") {
        await activateMutation.mutateAsync(payload.request as ActivatePlatformSubscriptionRequest);
        showSuccess(t("messages.activateSuccess"));
      } else if (payload.mode === "changePlan") {
        await changePlanMutation.mutateAsync(
          payload.request as ChangePlatformSubscriptionPlanRequest,
        );
        showSuccess(
          t("messages.changePlanSuccess"),
        );
      } else if (payload.mode === "extend") {
        await extendMutation.mutateAsync(payload.request as ExtendPlatformSubscriptionRequest);
        showSuccess(t("messages.extendSuccess"));
      } else {
        await suspendMutation.mutateAsync(payload.request as SuspendPlatformSubscriptionRequest);
        showSuccess(t("messages.suspendSuccess"));
      }

      setActionHistory((prev) => [
        {
          mode: payload.mode,
          companyName: modalState.company.name,
          reason: payload.reason || "-",
          createdAt: new Date().toISOString(),
        },
        ...prev.slice(0, 9),
      ]);
      setModalState(null);
    } catch (error) {
      handleApiError(error, t("messages.actionError"));
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ComponentCard title={t("cards.active.title")} desc={t("cards.active.description")}>
          <p className="text-3xl font-bold tracking-tight text-success-700 dark:text-success-300">
            {activeCompaniesCount}
          </p>
        </ComponentCard>
        <ComponentCard title={t("cards.expiring.title")} desc={t("cards.expiring.description")}>
          <p className="text-3xl font-bold tracking-tight text-warning-700 dark:text-warning-300">
            {expiringSoonCount}
          </p>
        </ComponentCard>
        <ComponentCard title={t("cards.suspended.title")} desc={t("cards.suspended.description")}>
          <p className="text-3xl font-bold tracking-tight text-error-700 dark:text-error-300">
            {suspendedCount}
          </p>
        </ComponentCard>
      </section>

      <ComponentCard title={t("plans.title")} desc={t("plans.description")}>
        <QueryState
          isLoading={plansQuery.isLoading}
          isError={plansQuery.isError}
          errorMessage={plansQuery.error?.message}
          isEmpty={!plansQuery.isLoading && plans.length === 0}
          emptyTitle={t("plans.emptyTitle")}
          emptyDescription={t("plans.emptyDescription")}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} locale={locale} t={t} />
            ))}
          </div>
        </QueryState>
      </ComponentCard>

      <ComponentCard title={t("governance.title")} desc={t("governance.description")}>
        <div className="text-xs text-text-secondary dark:text-slate-300">
          <p>{t("governance.requiredReason")}</p>
          <p>{t("governance.requiredConfirm")}</p>
        </div>
      </ComponentCard>

      <ComponentCard title={t("actionHistory.title")} desc={t("actionHistory.description")}>
        {actionHistory.length === 0 ? (
          <p className="text-sm text-text-secondary dark:text-slate-300">
            {t("actionHistory.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {actionHistory.map((item, index) => (
              <div
                key={`${item.mode}-${item.createdAt}-${index}`}
                className="grid grid-cols-1 gap-2 rounded-xl border border-border-light/80 bg-surface/60 p-3 text-sm dark:border-white/8 dark:bg-white/[0.03] md:grid-cols-4"
              >
                <span>
                  <span className="text-xs text-text-secondary dark:text-slate-400">
                    {t("actionHistory.fields.action")}:{" "}
                  </span>
                  {t(`actionHistory.kinds.${item.mode}`)}
                </span>
                <span>
                  <span className="text-xs text-text-secondary dark:text-slate-400">
                    {t("actionHistory.fields.company")}:{" "}
                  </span>
                  {item.companyName}
                </span>
                <span>
                  <span className="text-xs text-text-secondary dark:text-slate-400">
                    {t("actionHistory.fields.at")}:{" "}
                  </span>
                  {formatPlatformDate(locale, item.createdAt)}
                </span>
                <span>
                  <span className="text-xs text-text-secondary dark:text-slate-400">
                    {t("actionHistory.fields.reason")}:{" "}
                  </span>
                  {item.reason}
                </span>
              </div>
            ))}
          </div>
        )}
      </ComponentCard>

      <PlatformFiltersCard
        search={search}
        subscriptionStatus={subscriptionStatus}
        activeFilter={activeFilter}
        limit={limit}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onSubscriptionStatusChange={(value) => {
          setSubscriptionStatus(value);
          setPage(1);
        }}
        onActiveFilterChange={(value) => {
          setActiveFilter(value);
          setPage(1);
        }}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        onReset={() => {
          setSearch("");
          setSubscriptionStatus("all");
          setActiveFilter("all");
          setLimit(10);
          setPage(1);
        }}
      />

      <QueryState
        isLoading={companiesQuery.isLoading}
        isError={companiesQuery.isError}
        errorMessage={companiesQuery.error?.message}
        isEmpty={!companiesQuery.isLoading && companies.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
      >
        <DataTable
          data={companies}
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
            <div className="flex items-center gap-1 whitespace-nowrap">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:bg-surface hover:text-text-primary dark:border-border-strong dark:bg-surface-secondary dark:text-slate-300"
                onClick={() => setSelectedCompanyId(row.id)}
                title={t("actions.view")}
                aria-label={t("actions.view")}
              >
                <Eye className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:bg-surface hover:text-text-primary dark:border-border-strong dark:bg-surface-secondary dark:text-slate-300"
                onClick={() => setTimelineCompanyId(row.id)}
                title={t("actions.timeline")}
                aria-label={t("actions.timeline")}
              >
                <History className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:bg-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-strong dark:bg-surface-secondary dark:text-slate-300"
                disabled={activePlans.length === 0 || row.latestSubscription?.status === "ACTIVE"}
                onClick={() => setModalState({ mode: "activate", company: row })}
                title={t("actions.activate")}
                aria-label={t("actions.activate")}
              >
                <PlayCircle className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:bg-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-strong dark:bg-surface-secondary dark:text-slate-300"
                disabled={!row.latestSubscription || activePlans.length === 0}
                onClick={() => setModalState({ mode: "changePlan", company: row })}
                title={t("actions.changePlan")}
                aria-label={t("actions.changePlan")}
              >
                <Shuffle className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:bg-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-strong dark:bg-surface-secondary dark:text-slate-300"
                disabled={
                  !row.latestSubscription || row.latestSubscription.status === "SUSPENDED"
                }
                onClick={() => setModalState({ mode: "extend", company: row })}
                title={t("actions.extend")}
                aria-label={t("actions.extend")}
              >
                <RefreshCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-error-200 bg-error-50 text-error-600 transition hover:bg-error-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
                disabled={
                  !row.latestSubscription || row.latestSubscription.status === "SUSPENDED"
                }
                onClick={() => setModalState({ mode: "suspend", company: row })}
                title={t("actions.suspend")}
                aria-label={t("actions.suspend")}
              >
                <PauseCircle className="h-4 w-4" />
              </button>
            </div>
          )}
          ariaLabel={t("tableAriaLabel")}
          caption={t("tableCaption")}
        />
      </QueryState>

      <PlatformCompanyDetailsModal
        companyId={selectedCompanyId}
        open={Boolean(selectedCompanyId)}
        onClose={() => setSelectedCompanyId(null)}
      />

      <SubscriptionTimelineModal
        companyId={timelineCompanyId}
        open={Boolean(timelineCompanyId)}
        onClose={() => setTimelineCompanyId(null)}
      />

      <SubscriptionActionModal
        state={modalState}
        plans={activePlans}
        busy={isMutating}
        onClose={() => setModalState(null)}
        onSubmit={handleMutationSubmit}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useCloseDailyCashReconciliation,
  useCashReconciliationHistory,
  useDailyCashReconciliationById,
  useCompanyCashMode,
  useDailyCashReconciliation,
  useUpsertDailyCashReconciliation,
  useUpdateDailyCashReconciliation,
} from "@/lib/api/hooks/use-cash-reconciliation";
import type { CashReconciliationStatus } from "@/lib/api/services/cash-reconciliation";
import { QueryState } from "@/components/common/QueryState";

function todayAsBusinessDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function CashReconciliationSettingsClient() {
  const t = useTranslations("settings");
  const { locale } = useParams<{ locale: string }>();
  const [businessDate, setBusinessDate] = useState(todayAsBusinessDate);
  const [form, setForm] = useState({
    openingCash: "",
    cashSalesOutsideSystem: "",
    cashExpensesOutsideSystem: "",
    actualCashCounted: "",
    note: "",
  });
  const [feedback, setFeedback] = useState({ success: "", error: "" });
  const [historyFilters, setHistoryFilters] = useState<{
    dateFrom: string;
    dateTo: string;
    status: "" | CashReconciliationStatus;
    page: number;
    limit: number;
  }>({
    dateFrom: "",
    dateTo: "",
    status: "",
    page: 1,
    limit: 10,
  });
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");

  const modeQuery = useCompanyCashMode();
  const dailyQuery = useDailyCashReconciliation(businessDate);
  const historyQuery = useCashReconciliationHistory({
    dateFrom: historyFilters.dateFrom || undefined,
    dateTo: historyFilters.dateTo || undefined,
    status: historyFilters.status || undefined,
    page: historyFilters.page,
    limit: historyFilters.limit,
  });
  const historyDetailQuery = useDailyCashReconciliationById(selectedHistoryId);
  const upsertMutation = useUpsertDailyCashReconciliation();
  const updateMutation = useUpdateDailyCashReconciliation(businessDate);
  const closeMutation = useCloseDailyCashReconciliation(businessDate);

  useEffect(() => {
    if (!dailyQuery.data) {
      setForm({
        openingCash: "",
        cashSalesOutsideSystem: "",
        cashExpensesOutsideSystem: "",
        actualCashCounted: "",
        note: "",
      });
      return;
    }

    setForm({
      openingCash: String(dailyQuery.data.openingCash ?? ""),
      cashSalesOutsideSystem: String(dailyQuery.data.cashSalesOutsideSystem ?? ""),
      cashExpensesOutsideSystem: String(dailyQuery.data.cashExpensesOutsideSystem ?? ""),
      actualCashCounted: String(dailyQuery.data.actualCashCounted ?? ""),
      note: dailyQuery.data.note ?? "",
    });
  }, [dailyQuery.data]);

  const expectedCashPreview = useMemo(() => {
    return (
      toNumber(form.openingCash) +
      toNumber(form.cashSalesOutsideSystem) -
      toNumber(form.cashExpensesOutsideSystem)
    );
  }, [form.cashExpensesOutsideSystem, form.cashSalesOutsideSystem, form.openingCash]);

  const variancePreview = useMemo(() => {
    return toNumber(form.actualCashCounted) - expectedCashPreview;
  }, [form.actualCashCounted, expectedCashPreview]);

  const mode = modeQuery.data?.cashReconciliationMode;
  const isDisabled = mode === "DISABLED";
  const dailyRecord = dailyQuery.data;
  const isClosed = dailyRecord?.status === "CLOSED";
  const canClose = dailyRecord?.status === "DRAFT";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFeedback({ success: "", error: "" });

    const payload = {
      businessDate,
      openingCash: toNumber(form.openingCash),
      cashSalesOutsideSystem: toNumber(form.cashSalesOutsideSystem),
      cashExpensesOutsideSystem: toNumber(form.cashExpensesOutsideSystem),
      actualCashCounted: toNumber(form.actualCashCounted),
      note: form.note.trim() || undefined,
    };

    try {
      if (dailyRecord?.id) {
        await updateMutation.mutateAsync({
          id: dailyRecord.id,
          payload: {
            openingCash: payload.openingCash,
            cashSalesOutsideSystem: payload.cashSalesOutsideSystem,
            cashExpensesOutsideSystem: payload.cashExpensesOutsideSystem,
            actualCashCounted: payload.actualCashCounted,
            note: payload.note,
          },
        });
      } else {
        await upsertMutation.mutateAsync(payload);
      }

      setFeedback({ success: t("cashReconciliation.messages.saveSuccess"), error: "" });
    } catch {
      setFeedback({ success: "", error: t("cashReconciliation.messages.saveError") });
    }
  }

  async function handleCloseDay() {
    if (!dailyRecord?.id) {
      return;
    }

    setFeedback({ success: "", error: "" });
    try {
      await closeMutation.mutateAsync(dailyRecord.id);
      setFeedback({ success: t("cashReconciliation.messages.closeSuccess"), error: "" });
    } catch {
      setFeedback({ success: "", error: t("cashReconciliation.messages.closeError") });
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary">
        <h1 className="text-2xl font-bold text-text-primary">
          {t("cashReconciliation.title")}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t("cashReconciliation.subtitle")}
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-100">
        <p className="text-sm font-medium">{t("cashReconciliation.operationalOnly.title")}</p>
        <p className="mt-1 text-sm">{t("cashReconciliation.operationalOnly.description")}</p>
      </div>

      <QueryState
        isLoading={modeQuery.isLoading || dailyQuery.isLoading}
        isError={modeQuery.isError || dailyQuery.isError}
        errorMessage={
          modeQuery.error?.message ??
          dailyQuery.error?.message ??
          t("cashReconciliation.messages.loadError")
        }
      >
        {isDisabled ? (
          <div className="rounded-2xl border border-border-light bg-white p-6 shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary">
            <p className="text-sm text-text-secondary">
              {t("cashReconciliation.disabledMessage")}
            </p>
            <Link
              href={`/${locale}/settings/company`}
              className="mt-3 inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              {t("cashReconciliation.backToCompanySettings")}
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border-light bg-white p-6 shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary">
            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                {t("cashReconciliation.fields.businessDate")}
              </label>
              <input
                type="date"
                value={businessDate}
                onChange={(e) => setBusinessDate(e.target.value)}
                className="w-full max-w-xs rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-strong dark:bg-surface-tertiary"
              />
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    {t("cashReconciliation.fields.openingCash")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.openingCash}
                    onChange={(e) => setForm((prev) => ({ ...prev, openingCash: e.target.value }))}
                    disabled={isClosed}
                    className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 dark:border-border-strong dark:bg-surface-tertiary"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    {t("cashReconciliation.fields.cashSalesOutsideSystem")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.cashSalesOutsideSystem}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, cashSalesOutsideSystem: e.target.value }))
                    }
                    disabled={isClosed}
                    className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 dark:border-border-strong dark:bg-surface-tertiary"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    {t("cashReconciliation.fields.cashExpensesOutsideSystem")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.cashExpensesOutsideSystem}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, cashExpensesOutsideSystem: e.target.value }))
                    }
                    disabled={isClosed}
                    className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 dark:border-border-strong dark:bg-surface-tertiary"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    {t("cashReconciliation.fields.actualCashCounted")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.actualCashCounted}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, actualCashCounted: e.target.value }))
                    }
                    disabled={isClosed}
                    className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 dark:border-border-strong dark:bg-surface-tertiary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("cashReconciliation.fields.note")}
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  rows={3}
                  disabled={isClosed}
                  className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 dark:border-border-strong dark:bg-surface-tertiary"
                />
              </div>

              <div className="rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 dark:border-border-strong">
                <p className="text-sm text-text-secondary">
                  {t("cashReconciliation.preview.expectedCash")}:{" "}
                  <span className="font-semibold text-text-primary">{expectedCashPreview}</span>
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {t("cashReconciliation.preview.variance")}:{" "}
                  <span className="font-semibold text-text-primary">{variancePreview}</span>
                </p>
              </div>

              {feedback.success && (
                <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  {feedback.success}
                </p>
              )}
              {feedback.error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {feedback.error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={isClosed || upsertMutation.isPending || updateMutation.isPending}
                  className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("cashReconciliation.actions.saveDraft")}
                </button>

                <button
                  type="button"
                  onClick={handleCloseDay}
                  disabled={!canClose || closeMutation.isPending}
                  className="inline-flex items-center rounded-xl border border-border-light px-4 py-2 text-sm font-semibold text-text-primary hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-strong"
                >
                  {t("cashReconciliation.actions.closeDay")}
                </button>

                {isClosed && (
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {t("cashReconciliation.closedBadge")}
                  </span>
                )}
              </div>
            </form>
          </div>
        )}
      </QueryState>

      {!isDisabled && (
        <section className="space-y-4 rounded-2xl border border-border-light bg-white p-6 shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {t("cashReconciliation.history.title")}
              </h2>
              <p className="text-sm text-text-secondary">
                {t("cashReconciliation.history.subtitle")}
              </p>
            </div>
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {t("cashReconciliation.history.operationalBadge")}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="date"
              value={historyFilters.dateFrom}
              onChange={(e) =>
                setHistoryFilters((prev) => ({
                  ...prev,
                  dateFrom: e.target.value,
                  page: 1,
                }))
              }
              className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-2 text-sm text-text-primary dark:border-border-strong dark:bg-surface-tertiary"
            />
            <input
              type="date"
              value={historyFilters.dateTo}
              onChange={(e) =>
                setHistoryFilters((prev) => ({
                  ...prev,
                  dateTo: e.target.value,
                  page: 1,
                }))
              }
              className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-2 text-sm text-text-primary dark:border-border-strong dark:bg-surface-tertiary"
            />
            <select
              value={historyFilters.status}
              onChange={(e) =>
                setHistoryFilters((prev) => ({
                  ...prev,
                  status: e.target.value as "" | CashReconciliationStatus,
                  page: 1,
                }))
              }
              className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-2 text-sm text-text-primary dark:border-border-strong dark:bg-surface-tertiary"
            >
              <option value="">{t("cashReconciliation.history.statusAll")}</option>
              <option value="DRAFT">{t("cashReconciliation.history.statusDraft")}</option>
              <option value="CLOSED">{t("cashReconciliation.history.statusClosed")}</option>
            </select>
            <button
              type="button"
              onClick={() =>
                setHistoryFilters({
                  dateFrom: "",
                  dateTo: "",
                  status: "",
                  page: 1,
                  limit: historyFilters.limit,
                })
              }
              className="rounded-xl border border-border-light px-3 py-2 text-sm font-medium text-text-primary hover:border-primary/40 hover:text-primary dark:border-border-strong"
            >
              {t("cashReconciliation.history.resetFilters")}
            </button>
          </div>

          <QueryState
            isLoading={historyQuery.isLoading}
            isError={historyQuery.isError}
            errorMessage={historyQuery.error?.message ?? t("cashReconciliation.messages.loadError")}
          >
            <div className="overflow-x-auto rounded-xl border border-border-light dark:border-border-strong">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface-tertiary text-text-secondary dark:bg-surface-tertiary">
                  <tr>
                    <th className="px-3 py-2 text-start">{t("cashReconciliation.history.columns.businessDate")}</th>
                    <th className="px-3 py-2 text-start">{t("cashReconciliation.history.columns.status")}</th>
                    <th className="px-3 py-2 text-start">{t("cashReconciliation.history.columns.expectedCash")}</th>
                    <th className="px-3 py-2 text-start">{t("cashReconciliation.history.columns.actualCash")}</th>
                    <th className="px-3 py-2 text-start">{t("cashReconciliation.history.columns.variance")}</th>
                    <th className="px-3 py-2 text-start">{t("cashReconciliation.history.columns.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyQuery.data?.items ?? []).map((record) => (
                    <tr key={record.id} className="border-t border-border-light dark:border-border-strong">
                      <td className="px-3 py-2">{record.businessDate.slice(0, 10)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            record.status === "CLOSED"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}
                        >
                          {record.status === "CLOSED"
                            ? t("cashReconciliation.history.statusClosed")
                            : t("cashReconciliation.history.statusDraft")}
                        </span>
                      </td>
                      <td className="px-3 py-2">{record.expectedCash}</td>
                      <td className="px-3 py-2">{record.actualCashCounted}</td>
                      <td className="px-3 py-2">{record.variance}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryId(record.id)}
                          className="rounded-lg border border-border-light px-2.5 py-1 text-xs font-medium text-text-primary hover:border-primary/40 hover:text-primary dark:border-border-strong"
                        >
                          {t("cashReconciliation.history.viewDetail")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                {t("cashReconciliation.history.pagination", {
                  page: historyQuery.data?.meta.page ?? 1,
                  totalPages: historyQuery.data?.meta.totalPages ?? 1,
                  total: historyQuery.data?.meta.total ?? 0,
                })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!historyQuery.data?.meta.hasPrev}
                  onClick={() =>
                    setHistoryFilters((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))
                  }
                  className="rounded-lg border border-border-light px-2.5 py-1 text-xs font-medium text-text-primary disabled:opacity-50 dark:border-border-strong"
                >
                  {t("cashReconciliation.history.prev")}
                </button>
                <button
                  type="button"
                  disabled={!historyQuery.data?.meta.hasNext}
                  onClick={() =>
                    setHistoryFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  className="rounded-lg border border-border-light px-2.5 py-1 text-xs font-medium text-text-primary disabled:opacity-50 dark:border-border-strong"
                >
                  {t("cashReconciliation.history.next")}
                </button>
              </div>
            </div>
          </QueryState>

          {selectedHistoryId && (
            <QueryState
              isLoading={historyDetailQuery.isLoading}
              isError={historyDetailQuery.isError}
              errorMessage={
                historyDetailQuery.error?.message ?? t("cashReconciliation.messages.loadError")
              }
            >
              {historyDetailQuery.data && (
                <div className="rounded-xl border border-border-light bg-surface-tertiary p-4 dark:border-border-strong">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {t("cashReconciliation.detail.title")}
                    </h3>
                    <span className="text-xs text-text-muted">
                      {historyDetailQuery.data.businessDate.slice(0, 10)}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border-light bg-white p-3 dark:border-border-strong dark:bg-surface-secondary">
                      <p className="text-xs font-semibold uppercase text-text-muted">
                        {t("cashReconciliation.detail.inputs")}
                      </p>
                      <p className="mt-2 text-xs text-text-secondary">
                        {t("cashReconciliation.fields.openingCash")}:{" "}
                        <span className="font-semibold text-text-primary">
                          {historyDetailQuery.data.openingCash}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {t("cashReconciliation.fields.cashSalesOutsideSystem")}:{" "}
                        <span className="font-semibold text-text-primary">
                          {historyDetailQuery.data.cashSalesOutsideSystem}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {t("cashReconciliation.fields.cashExpensesOutsideSystem")}:{" "}
                        <span className="font-semibold text-text-primary">
                          {historyDetailQuery.data.cashExpensesOutsideSystem}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {t("cashReconciliation.fields.actualCashCounted")}:{" "}
                        <span className="font-semibold text-text-primary">
                          {historyDetailQuery.data.actualCashCounted}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-lg border border-border-light bg-white p-3 dark:border-border-strong dark:bg-surface-secondary">
                      <p className="text-xs font-semibold uppercase text-text-muted">
                        {t("cashReconciliation.detail.calculated")}
                      </p>
                      <p className="mt-2 text-xs text-text-secondary">
                        {t("cashReconciliation.preview.expectedCash")}:{" "}
                        <span className="font-semibold text-text-primary">
                          {historyDetailQuery.data.expectedCash}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {t("cashReconciliation.preview.variance")}:{" "}
                        <span className="font-semibold text-text-primary">
                          {historyDetailQuery.data.variance}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {t("cashReconciliation.history.columns.status")}:{" "}
                        <span className="font-semibold text-text-primary">
                          {historyDetailQuery.data.status}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-lg border border-border-light bg-white p-3 dark:border-border-strong dark:bg-surface-secondary">
                      <p className="text-xs font-semibold uppercase text-text-muted">
                        {t("cashReconciliation.detail.audit")}
                      </p>
                      <p className="mt-2 text-xs text-text-secondary">
                        {t("cashReconciliation.detail.createdAt")}:{" "}
                        <span className="font-semibold text-text-primary">
                          {new Date(historyDetailQuery.data.createdAt).toLocaleString()}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {t("cashReconciliation.detail.updatedAt")}:{" "}
                        <span className="font-semibold text-text-primary">
                          {new Date(historyDetailQuery.data.updatedAt).toLocaleString()}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {t("cashReconciliation.detail.closedAt")}:{" "}
                        <span className="font-semibold text-text-primary">
                          {historyDetailQuery.data.closedAt
                            ? new Date(historyDetailQuery.data.closedAt).toLocaleString()
                            : "-"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-text-secondary">
                    {t("cashReconciliation.fields.note")}:{" "}
                    <span className="font-semibold text-text-primary">
                      {historyDetailQuery.data.note || "-"}
                    </span>
                  </p>
                </div>
              )}
            </QueryState>
          )}
        </section>
      )}
    </div>
  );
}

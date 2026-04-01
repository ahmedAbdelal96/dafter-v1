"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMyCompany, useUpdateMyCompany } from "@/lib/api/hooks/use-company";
import {
  useCompanyCashMode,
  useUpdateCompanyCashMode,
} from "@/lib/api/hooks/use-cash-reconciliation";
import type { CashReconciliationMode } from "@/lib/api/services/cash-reconciliation";
import { QueryState } from "@/components/common/QueryState";

const CURRENCIES = ["EGP", "USD", "EUR", "SAR", "AED"];

export function CompanySettingsClient() {
  const t = useTranslations("settings");
  const { locale } = useParams<{ locale: string }>();
  const { data: company, isLoading, error, refetch } = useMyCompany();
  const { data: cashModeData, isLoading: cashModeLoading } = useCompanyCashMode();
  const updateMutation = useUpdateMyCompany();
  const updateCashModeMutation = useUpdateCompanyCashMode();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    currencyCode: "EGP",
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [cashMode, setCashMode] = useState<CashReconciliationMode>("DISABLED");
  const [cashModeMsg, setCashModeMsg] = useState("");
  const [cashModeErrorMsg, setCashModeErrorMsg] = useState("");

  // Sync form when company data loads
  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? "",
        phone: company.phone ?? "",
        address: company.address ?? "",
        currencyCode: company.currencyCode ?? "EGP",
      });
    }
  }, [company]);

  useEffect(() => {
    if (cashModeData?.cashReconciliationMode) {
      setCashMode(cashModeData.cashReconciliationMode);
    }
  }, [cashModeData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await updateMutation.mutateAsync({
        name: form.name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        currencyCode: form.currencyCode || undefined,
      });
      setSuccessMsg(t("company.messages.updateSuccess"));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setErrorMsg(t("company.messages.versionConflict"));
        void refetch();
      } else {
        setErrorMsg(t("company.messages.updateError"));
      }
    }
  }

  async function handleCashModeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCashModeMsg("");
    setCashModeErrorMsg("");

    try {
      await updateCashModeMutation.mutateAsync({ mode: cashMode });
      setCashModeMsg(t("company.cashReconciliation.messages.updateSuccess"));
    } catch {
      setCashModeErrorMsg(t("company.cashReconciliation.messages.updateError"));
    }
  }

  const activeSubscription = company?.subscriptions?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary">
        <h1 className="text-2xl font-bold text-text-primary">{t("company.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("company.subtitle")}</p>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={Boolean(error)}
        errorMessage={error?.message}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border-light bg-white p-6 shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Company Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    {t("company.fields.name")}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={t("company.fields.namePlaceholder")}
                    className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-strong dark:bg-surface-tertiary"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    {t("company.fields.phone")}
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder={t("company.fields.phonePlaceholder")}
                    className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-strong dark:bg-surface-tertiary"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    {t("company.fields.address")}
                  </label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder={t("company.fields.addressPlaceholder")}
                    rows={3}
                    className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-strong dark:bg-surface-tertiary"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    {t("company.fields.currencyCode")}
                  </label>
                  <select
                    value={form.currencyCode}
                    onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value }))}
                    className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-strong dark:bg-surface-tertiary"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Feedback */}
                {successMsg && (
                  <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    {successMsg}
                  </p>
                )}
                {errorMsg && (
                  <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateMutation.isPending ? t("actions.saving") : t("actions.save")}
                </button>
              </form>
            </div>
          </div>

          {/* Subscription Info */}
          <div>
            <div className="mb-4 rounded-2xl border border-border-light bg-white p-5 shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary">
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-muted">
                {t("company.cashReconciliation.title")}
              </h2>
              <p className="mb-4 text-sm text-text-secondary">
                {t("company.cashReconciliation.subtitle")}
              </p>

              <form onSubmit={handleCashModeSubmit} className="space-y-3">
                <label className="block text-sm font-medium text-text-primary">
                  {t("company.cashReconciliation.modeLabel")}
                </label>
                <select
                  value={cashMode}
                  onChange={(e) => setCashMode(e.target.value as CashReconciliationMode)}
                  disabled={cashModeLoading || updateCashModeMutation.isPending}
                  className="w-full rounded-xl border border-border-light bg-surface-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-strong dark:bg-surface-tertiary"
                >
                  <option value="DISABLED">
                    {t("company.cashReconciliation.modes.disabled")}
                  </option>
                  <option value="SIMPLE_DAILY">
                    {t("company.cashReconciliation.modes.simpleDaily")}
                  </option>
                </select>

                {cashModeMsg && (
                  <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    {cashModeMsg}
                  </p>
                )}
                {cashModeErrorMsg && (
                  <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    {cashModeErrorMsg}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={cashModeLoading || updateCashModeMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updateCashModeMutation.isPending
                      ? t("actions.saving")
                      : t("company.cashReconciliation.saveMode")}
                  </button>

                  {cashMode === "SIMPLE_DAILY" && (
                    <Link
                      href={`/${locale}/settings/cash-reconciliation`}
                      className="inline-flex items-center rounded-xl border border-border-light px-4 py-2 text-sm font-medium text-text-primary hover:border-primary/40 hover:text-primary dark:border-border-strong"
                    >
                      {t("company.cashReconciliation.openDaily")}
                    </Link>
                  )}
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-border-light bg-white p-5 shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
                {t("company.subscription.title")}
              </h2>

              {activeSubscription ? (
                <dl className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-sm text-text-secondary">{t("company.subscription.plan")}</dt>
                    <dd className="text-sm font-semibold text-text-primary">
                      {activeSubscription.plan.name}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-sm text-text-secondary">{t("company.subscription.status")}</dt>
                    <dd>
                      <span className="inline-flex items-center rounded-lg bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary dark:bg-primary/10">
                        {activeSubscription.status}
                      </span>
                    </dd>
                  </div>
                  {activeSubscription.endDate && (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-sm text-text-secondary">{t("company.subscription.expiresAt")}</dt>
                      <dd className="text-sm text-text-primary">
                        {new Date(activeSubscription.endDate).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-text-muted">{t("company.subscription.noSubscription")}</p>
              )}
            </div>

            {/* Read-only metadata */}
            {company && (
              <div className="mt-4 rounded-2xl border border-border-light bg-surface-tertiary p-4 dark:border-border-strong">
                <p className="text-xs text-text-muted">
                  {t("company.fields.currencyCode")}: <span className="font-semibold text-text-secondary">{company.currencyCode}</span>
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  ID: <span className="font-mono text-text-secondary">{company.id.slice(0, 8)}…</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </QueryState>
    </div>
  );
}

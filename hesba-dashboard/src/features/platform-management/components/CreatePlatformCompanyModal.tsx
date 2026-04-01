"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox from "@/components/ui/combobox/Combobox";
import { Modal } from "@/components/ui/modal";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useCreatePlatformCompany } from "@/lib/api/hooks/use-platform";
import type { PlatformPlan } from "@/lib/api/services/platform";

interface CreatePlatformCompanyModalProps {
  open: boolean;
  plans: PlatformPlan[];
  onClose: () => void;
}

const DEFAULT_CURRENCY = "EGP";
const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;
const TRIAL_DAY_OPTIONS = [7, 10, 14, 30] as const;
const TERM_MONTH_OPTIONS = [1, 3, 6, 12] as const;
type SubscriptionMode = "trial" | "paid";

export function CreatePlatformCompanyModal({ open, plans, onClose }: CreatePlatformCompanyModalProps) {
  const t = useTranslations("platformManagement.tenants.createModal");
  const { handleValidationError, handleApiError, showSuccess } = useErrorHandler();
  const createCompanyMutation = useCreatePlatformCompany();
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY);
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [planId, setPlanId] = useState("");
  const [subscriptionMode, setSubscriptionMode] = useState<SubscriptionMode>("trial");
  const [trialDays, setTrialDays] = useState<number>(14);
  const [termMonths, setTermMonths] = useState<number>(1);
  const [autoRenew, setAutoRenew] = useState(false);

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);
  const selectedPlan = useMemo(
    () => activePlans.find((plan) => plan.id === planId) ?? null,
    [activePlans, planId],
  );
  const planOptions = useMemo(
    () =>
      activePlans.map((plan) => ({
        value: plan.id,
        label: plan.name,
      })),
    [activePlans],
  );

  const resetForm = () => {
    setCompanyName("");
    setCompanyPhone("");
    setCompanyAddress("");
    setCurrencyCode(DEFAULT_CURRENCY);
    setOwnerFullName("");
    setOwnerEmail("");
    setOwnerPassword("");
    setOwnerPhone("");
    setPlanId("");
    setSubscriptionMode("trial");
    setTrialDays(14);
    setTermMonths(1);
    setAutoRenew(false);
  };

  const handleClose = () => {
    if (createCompanyMutation.isPending) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!companyName.trim() || !ownerFullName.trim() || !ownerEmail.trim() || !ownerPassword.trim()) {
      handleValidationError(t("errors.requiredFields"));
      return;
    }

    if (!planId) {
      handleValidationError(t("errors.planRequired"));
      return;
    }

    if (subscriptionMode === "trial" && !trialDays) {
      handleValidationError(t("errors.trialDaysRequired"));
      return;
    }

    if (subscriptionMode === "paid" && !termMonths) {
      handleValidationError(t("errors.termMonthsRequired"));
      return;
    }

    const normalizedCurrency = currencyCode.trim().toUpperCase() || DEFAULT_CURRENCY;
    if (!CURRENCY_CODE_REGEX.test(normalizedCurrency)) {
      handleValidationError(t("errors.currencyCodeInvalid"));
      return;
    }

    try {
      await createCompanyMutation.mutateAsync({
        companyName: companyName.trim(),
        companyPhone: companyPhone.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
        currencyCode: normalizedCurrency,
        ownerFullName: ownerFullName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPassword: ownerPassword.trim(),
        ownerPhone: ownerPhone.trim() || undefined,
        planId,
        trialDays: subscriptionMode === "trial" ? trialDays : undefined,
        termMonths: subscriptionMode === "paid" ? termMonths : undefined,
        autoRenew,
      });
      showSuccess(t("messages.success"));
      handleClose();
    } catch (error) {
      handleApiError(error, t("messages.error"));
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} className="mx-auto w-full max-w-3xl p-6 sm:p-8">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">{t("title")}</h2>
          <p className="mt-2 text-sm text-text-secondary dark:text-slate-300">{t("description")}</p>
        </div>

        <section className="space-y-4 rounded-2xl border border-border-light/80 bg-surface/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <h3 className="text-sm font-semibold text-text-primary dark:text-white">{t("sections.company")}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder={t("fields.companyName")} />
            <Input value={companyPhone} onChange={(event) => setCompanyPhone(event.target.value)} placeholder={t("fields.companyPhone")} />
            <Input value={companyAddress} onChange={(event) => setCompanyAddress(event.target.value)} placeholder={t("fields.companyAddress")} />
            <Input value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} placeholder={t("fields.currencyCode")} maxLength={3} />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border-light/80 bg-surface/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <h3 className="text-sm font-semibold text-text-primary dark:text-white">{t("sections.owner")}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input value={ownerFullName} onChange={(event) => setOwnerFullName(event.target.value)} placeholder={t("fields.ownerFullName")} />
            <Input type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder={t("fields.ownerEmail")} />
            <Input type="password" value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} placeholder={t("fields.ownerPassword")} />
            <Input value={ownerPhone} onChange={(event) => setOwnerPhone(event.target.value)} placeholder={t("fields.ownerPhone")} />
          </div>
          <p className="text-xs text-text-secondary dark:text-slate-400">{t("passwordHint")}</p>
        </section>

        <section className="space-y-4 rounded-2xl border border-border-light/80 bg-surface/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <h3 className="text-sm font-semibold text-text-primary dark:text-white">{t("sections.subscription")}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Combobox
              value={planId}
              options={planOptions}
              placeholder={t("fields.plan")}
              searchPlaceholder={t("fields.planSearch")}
              emptyText={t("emptyPlans")}
              loading={false}
              searchable
              onChange={(value) => setPlanId(value ?? "")}
            />
            <Combobox
              value={subscriptionMode}
              options={[
                { value: "trial", label: t("fields.subscriptionModeOptions.trial") },
                { value: "paid", label: t("fields.subscriptionModeOptions.paid") },
              ]}
              placeholder={t("fields.subscriptionMode")}
              loading={false}
              searchable={false}
              onChange={(value) => setSubscriptionMode((value as SubscriptionMode | null) ?? "trial")}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {subscriptionMode === "trial" ? (
              <Combobox
                value={String(trialDays)}
                options={TRIAL_DAY_OPTIONS.map((days) => ({
                  value: String(days),
                  label: t("fields.trialDaysOption", { days }),
                }))}
                placeholder={t("fields.trialDays")}
                loading={false}
                searchable={false}
                onChange={(value) => setTrialDays(Number(value ?? 14))}
              />
            ) : (
              <Combobox
                value={String(termMonths)}
                options={TERM_MONTH_OPTIONS.map((months) => ({
                  value: String(months),
                  label: t("fields.termMonthsOption", { months }),
                }))}
                placeholder={t("fields.termMonths")}
                loading={false}
                searchable={false}
                onChange={(value) => setTermMonths(Number(value ?? 1))}
              />
            )}
            <Input
              value={
                selectedPlan
                  ? t("fields.planCycleValue", {
                      cycle: t(`fields.planCycleOptions.${selectedPlan.billingCycle.toLowerCase()}`),
                    })
                  : ""
              }
              placeholder={t("fields.planCycle")}
              readOnly
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-primary dark:text-white">
            <input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary" />
            {t("fields.autoRenew")}
          </label>
        </section>

        <div className="flex justify-end gap-3">
          <Button variant="danger" onClick={handleClose}>{t("cancel")}</Button>
          <Button variant="primary" disabled={createCompanyMutation.isPending || activePlans.length === 0} onClick={() => void handleSubmit()}>
            {createCompanyMutation.isPending ? t("submitting") : t("submit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}



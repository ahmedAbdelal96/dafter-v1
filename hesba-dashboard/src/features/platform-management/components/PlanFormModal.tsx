"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import type { PlatformPlan } from "@/lib/api/services/platform";
import {
  platformPlanFormSchema,
  toPlatformPlanPayload,
  type PlatformPlanFormValues,
} from "../utils/plan-schemas";

interface PlanFormModalProps {
  open: boolean;
  loading: boolean;
  mode: "create" | "edit";
  plan: PlatformPlan | null;
  onClose: () => void;
  onSubmit: (payload: ReturnType<typeof toPlatformPlanPayload>) => Promise<void>;
}

const BILLING_CYCLE_OPTIONS: ComboboxOption[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

function toDefaultValues(plan: PlatformPlan | null): PlatformPlanFormValues {
  return {
    name: plan?.name ?? "",
    price: plan?.price != null ? String(plan.price) : "",
    currencyCode: plan?.currencyCode ?? "EGP",
    billingCycle: plan?.billingCycle ?? "MONTHLY",
    maxUsers: plan?.maxUsers != null ? String(plan.maxUsers) : "",
    maxCustomers: plan?.maxCustomers != null ? String(plan.maxCustomers) : "",
    maxSuppliers: plan?.maxSuppliers != null ? String(plan.maxSuppliers) : "",
    maxEmployees: plan?.maxEmployees != null ? String(plan.maxEmployees) : "",
    maxLedgerEntries:
      plan?.maxLedgerEntries != null ? String(plan.maxLedgerEntries) : "",
    featuresText: (plan?.features ?? []).join(", "),
    isActive: plan?.isActive ?? true,
  };
}

export function PlanFormModal({
  open,
  loading,
  mode,
  plan,
  onClose,
  onSubmit,
}: PlanFormModalProps) {
  const t = useTranslations("platformManagement.plansManagement.modal");
  const tPage = useTranslations("platformManagement.plansManagement");

  const form = useForm<PlatformPlanFormValues>({
    resolver: zodResolver(platformPlanFormSchema),
    defaultValues: toDefaultValues(null),
  });
  const billingCycleValue = useWatch({
    control: form.control,
    name: "billingCycle",
  });
  const isActiveValue = useWatch({
    control: form.control,
    name: "isActive",
  });

  useEffect(() => {
    if (!open) return;
    form.reset(toDefaultValues(plan));
  }, [open, plan, form]);

  const title = mode === "create" ? t("titles.create") : t("titles.edit");
  const submitLabel = mode === "create" ? t("submit.create") : t("submit.edit");

  return (
    <Modal isOpen={open} onClose={onClose} className="mx-auto w-full max-w-3xl p-6 sm:p-8">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">
            {title}
          </h2>
          <p className="mt-2 text-sm text-text-secondary dark:text-slate-300">
            {t("description")}
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => onSubmit(toPlatformPlanPayload(values)))}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="plan-name">{t("fields.name")}</Label>
              <Input id="plan-name" {...form.register("name")} />
            </div>

            <div>
              <Label htmlFor="plan-cycle">{t("fields.billingCycle")}</Label>
              <Combobox
                value={billingCycleValue}
                options={BILLING_CYCLE_OPTIONS.map((option) => ({
                  ...option,
                  label:
                    option.value === "MONTHLY"
                      ? tPage("billingCycle.MONTHLY")
                      : tPage("billingCycle.YEARLY"),
                }))}
                searchable={false}
                placeholder={t("fields.billingCycle")}
                onChange={(value) =>
                  form.setValue(
                    "billingCycle",
                    (value as "MONTHLY" | "YEARLY" | undefined) ?? "MONTHLY",
                  )
                }
              />
            </div>

            <div>
              <Label htmlFor="plan-price">{t("fields.price")}</Label>
              <Input id="plan-price" type="number" min="0" step="0.01" {...form.register("price")} />
            </div>

            <div>
              <Label htmlFor="plan-currency">{t("fields.currencyCode")}</Label>
              <Input id="plan-currency" maxLength={3} {...form.register("currencyCode")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="plan-max-users">{t("fields.maxUsers")}</Label>
              <Input id="plan-max-users" type="number" min="1" {...form.register("maxUsers")} />
            </div>
            <div>
              <Label htmlFor="plan-max-customers">{t("fields.maxCustomers")}</Label>
              <Input
                id="plan-max-customers"
                type="number"
                min="1"
                {...form.register("maxCustomers")}
              />
            </div>
            <div>
              <Label htmlFor="plan-max-suppliers">{t("fields.maxSuppliers")}</Label>
              <Input
                id="plan-max-suppliers"
                type="number"
                min="1"
                {...form.register("maxSuppliers")}
              />
            </div>
            <div>
              <Label htmlFor="plan-max-employees">{t("fields.maxEmployees")}</Label>
              <Input
                id="plan-max-employees"
                type="number"
                min="1"
                {...form.register("maxEmployees")}
              />
            </div>
            <div>
              <Label htmlFor="plan-max-ledger">{t("fields.maxLedgerEntries")}</Label>
              <Input
                id="plan-max-ledger"
                type="number"
                min="1"
                {...form.register("maxLedgerEntries")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="plan-features">{t("fields.features")}</Label>
            <Input id="plan-features" {...form.register("featuresText")} />
            <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">
              {t("fields.featuresHint")}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-primary dark:text-white">
            <input
              type="checkbox"
              checked={Boolean(isActiveValue)}
              onChange={(event) => form.setValue("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary"
            />
            {t("fields.isActive")}
          </label>

          <p className="text-xs text-text-secondary dark:text-slate-400">{t("limitsHint")}</p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="danger" onClick={onClose} disabled={loading}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("submitting") : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

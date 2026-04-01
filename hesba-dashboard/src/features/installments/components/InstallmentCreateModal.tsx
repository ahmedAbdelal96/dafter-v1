"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { Modal } from "@/components/ui/modal";
import type {
  CreateInstallmentContractRequest,
  PartyType,
} from "@/lib/api/types";
import {
  installmentCreateSchema,
  type InstallmentCreateFormValues,
} from "../utils/installments-schemas";

interface InstallmentCreateModalProps {
  open: boolean;
  loading: boolean;
  partyOptions: ComboboxOption[];
  onClose: () => void;
  onSubmit: (payload: CreateInstallmentContractRequest) => Promise<void>;
}

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export function InstallmentCreateModal({
  open,
  loading,
  partyOptions,
  onClose,
  onSubmit,
}: InstallmentCreateModalProps) {
  const t = useTranslations("installments");

  const form = useForm<InstallmentCreateFormValues>({
    resolver: zodResolver(installmentCreateSchema),
    defaultValues: {
      partyType: "CUSTOMER",
      partyId: "",
      totalAmount: 0,
      downPayment: 0,
      numberOfInstallments: 3,
      scheduleType: "FIXED",
      startDate: todayIsoDate(),
      scheduleItems: [],
      description: "",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "scheduleItems",
  });

  const partyType = form.watch("partyType");
  const scheduleType = form.watch("scheduleType");
  const numberOfInstallments = form.watch("numberOfInstallments");

  useEffect(() => {
    if (scheduleType !== "CUSTOM") {
      if (fields.length === 0) {
        return;
      }

      replace([]);
      return;
    }

    const count = Number.isFinite(numberOfInstallments) ? Math.max(1, numberOfInstallments) : 1;

    if (fields.length === count) {
      return;
    }

    const currentItems = form.getValues("scheduleItems") ?? [];

    const next = Array.from({ length: count }).map((_, index) => ({
      dueDate: currentItems[index]?.dueDate || todayIsoDate(),
      amount: Number(currentItems[index]?.amount ?? 0),
      notes: currentItems[index]?.notes || "",
    }));

    replace(next);
  }, [fields.length, form, numberOfInstallments, replace, scheduleType]);

  const partyTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "CUSTOMER", label: t("filters.partyTypeCustomer") },
      { value: "SUPPLIER", label: t("filters.partyTypeSupplier") },
      { value: "EMPLOYEE", label: t("filters.partyTypeEmployee") },
    ],
    [t],
  );

  const scheduleTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "FIXED", label: t("createModal.scheduleTypeFixed") },
      { value: "CUSTOM", label: t("createModal.scheduleTypeCustom") },
    ],
    [t],
  );

  const filteredPartyOptions = useMemo(() => {
    const suffix =
      partyType === "CUSTOMER"
        ? t("filters.partyTypeCustomer")
        : partyType === "SUPPLIER"
          ? t("filters.partyTypeSupplier")
          : t("filters.partyTypeEmployee");

    return partyOptions.filter((option) => option.label.includes(`(${suffix})`));
  }, [partyOptions, partyType, t]);

  const handleSubmit = async (values: InstallmentCreateFormValues) => {
    await onSubmit({
      partyType: values.partyType,
      partyId: values.partyId,
      totalAmount: values.totalAmount,
      downPayment: values.downPayment ?? 0,
      numberOfInstallments: values.numberOfInstallments,
      scheduleType: values.scheduleType,
      startDate: values.startDate,
      scheduleItems:
        values.scheduleType === "CUSTOM"
          ? (values.scheduleItems ?? []).map((item) => ({
              dueDate: item.dueDate,
              amount: item.amount,
              notes: item.notes || undefined,
            }))
          : undefined,
      description: values.description || undefined,
    });
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-h-[95vh] max-w-5xl overflow-y-auto p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("createModal.title")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("createModal.description")}</p>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label>{t("form.partyType")}</Label>
            <Combobox
              value={partyType}
              options={partyTypeOptions}
              searchable={false}
              placeholder={t("form.partyType")}
              searchPlaceholder={t("form.partyType")}
              onChange={(value) => {
                form.setValue("partyType", (value as PartyType | undefined) ?? "CUSTOMER");
                form.setValue("partyId", "");
              }}
            />
          </div>

          <div>
            <Label>{t("form.party")}</Label>
            <Combobox
              value={form.watch("partyId")}
              options={filteredPartyOptions}
              searchable
              placeholder={t("form.party")}
              searchPlaceholder={t("filters.searchParty")}
              emptyText={t("filters.noParties")}
              onChange={(value) => form.setValue("partyId", value ?? "", { shouldValidate: true })}
            />
            {form.formState.errors.partyId && (
              <p className="mt-1 text-xs text-error-600 dark:text-error-400">{form.formState.errors.partyId.message}</p>
            )}
          </div>

          <div>
            <Label>{t("form.scheduleType")}</Label>
            <Combobox
              value={scheduleType}
              options={scheduleTypeOptions}
              searchable={false}
              placeholder={t("form.scheduleType")}
              searchPlaceholder={t("form.scheduleType")}
              onChange={(value) =>
                form.setValue("scheduleType", (value as "FIXED" | "CUSTOM" | undefined) ?? "FIXED")
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="installment-total">{t("form.totalAmount")}</Label>
            <Input
              id="installment-total"
              type="number"
              min={0.01}
              step="0.01"
              dir="ltr"
              error={!!form.formState.errors.totalAmount}
              hint={form.formState.errors.totalAmount?.message}
              {...form.register("totalAmount", { setValueAs: (value) => Number(value) })}
            />
          </div>

          <div>
            <Label htmlFor="installment-down">{t("form.downPayment")}</Label>
            <Input
              id="installment-down"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              error={!!form.formState.errors.downPayment}
              hint={form.formState.errors.downPayment?.message}
              {...form.register("downPayment", { setValueAs: (value) => Number(value || 0) })}
            />
          </div>

          <div>
            <Label htmlFor="installment-count">{t("form.numberOfInstallments")}</Label>
            <Input
              id="installment-count"
              type="number"
              min={1}
              max={360}
              dir="ltr"
              error={!!form.formState.errors.numberOfInstallments}
              hint={form.formState.errors.numberOfInstallments?.message}
              {...form.register("numberOfInstallments", { setValueAs: (value) => Number(value) })}
            />
          </div>

          <div>
            <Label htmlFor="installment-start">{t("form.startDate")}</Label>
            <Input
              id="installment-start"
              type="date"
              error={!!form.formState.errors.startDate}
              hint={form.formState.errors.startDate?.message}
              {...form.register("startDate")}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="installment-description">{t("form.description")}</Label>
          <Input id="installment-description" {...form.register("description")} />
        </div>

        {scheduleType === "CUSTOM" && (
          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t("createModal.customScheduleTitle")}</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                startIcon={<Plus size={14} />}
                onClick={() => append({ dueDate: todayIsoDate(), amount: 0, notes: "" })}
              >
                {t("createModal.addScheduleItem")}
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-12 dark:border-gray-700">
                  <div className="md:col-span-3">
                    <Label>{t("createModal.scheduleDueDate")}</Label>
                    <Input
                      type="date"
                      {...form.register(`scheduleItems.${index}.dueDate` as const)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>{t("createModal.scheduleAmount")}</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      dir="ltr"
                      {...form.register(`scheduleItems.${index}.amount` as const, {
                        setValueAs: (value) => Number(value),
                      })}
                    />
                  </div>
                  <div className="md:col-span-5">
                    <Label>{t("createModal.scheduleNotes")}</Label>
                    <Input {...form.register(`scheduleItems.${index}.notes` as const)} />
                  </div>
                  <div className="md:col-span-1 md:pt-7">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-error-500 hover:bg-error-50 disabled:opacity-50"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      title={t("actions.remove")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="danger" onClick={onClose} disabled={loading}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t("actions.saving") : t("actions.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


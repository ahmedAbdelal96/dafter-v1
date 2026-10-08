"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { Modal } from "@/components/ui/modal";
import type { CreateLedgerEntryRequest } from "@/lib/api/types";
import {
  createSupplierLedgerEntrySchema,
  type CreateSupplierLedgerEntryFormValues,
} from "../utils/supplier-schemas";

interface SupplierLedgerEntryModalProps {
  open: boolean;
  loading: boolean;
  supplierId: string;
  onClose: () => void;
  onSubmit: (payload: CreateLedgerEntryRequest) => Promise<void>;
}

function toSignedAmount(amount: number, increaseBalance: boolean): number {
  return increaseBalance ? amount : -amount;
}

export function SupplierLedgerEntryModal({
  open,
  loading,
  supplierId,
  onClose,
  onSubmit,
}: SupplierLedgerEntryModalProps) {
  const t = useTranslations("suppliers");

  const form = useForm<CreateSupplierLedgerEntryFormValues>({
    resolver: zodResolver(createSupplierLedgerEntrySchema),
    defaultValues: {
      entryType: "INVOICE",
      amount: 0,
      increaseBalance: true,
      entryDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      note: "",
    },
  });

  const entryType = useWatch({ control: form.control, name: "entryType" });
  const increaseBalance = useWatch({
    control: form.control,
    name: "increaseBalance",
  });

  useEffect(() => {
    if (!open) return;

    const defaultsByType: Record<string, boolean> = {
      INVOICE: true,
      PAYMENT: false,
      RETURN: false,
      ADJUSTMENT: true,
    };

    form.setValue("increaseBalance", defaultsByType[entryType] ?? true);
  }, [entryType, form, open]);

  const handleSubmit = async (values: CreateSupplierLedgerEntryFormValues) => {
    await onSubmit({
      partyType: "SUPPLIER",
      partyId: supplierId,
      entryType: values.entryType,
      signedAmount: toSignedAmount(values.amount, values.increaseBalance),
      entryDate: values.entryDate,
      dueDate: values.dueDate || undefined,
      note: values.note || undefined,
    });

    form.reset({
      entryType: "INVOICE",
      amount: 0,
      increaseBalance: true,
      entryDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      note: "",
    });
    onClose();
  };
  const entryTypeOptions: ComboboxOption[] = [
    { value: "INVOICE", label: t("ledger.entryTypes.INVOICE") },
    { value: "PAYMENT", label: t("ledger.entryTypes.PAYMENT") },
    { value: "RETURN", label: t("ledger.entryTypes.RETURN") },
    { value: "ADJUSTMENT", label: t("ledger.entryTypes.ADJUSTMENT") },
  ];

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("ledger.modal.title")}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t("ledger.modal.description")}
      </p>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ledger-entry-type">{t("ledger.form.entryType")}</Label>
            <Combobox
              value={entryType}
              options={entryTypeOptions}
              searchable={false}
              placeholder={t("ledger.form.entryType")}
              searchPlaceholder={t("ledger.form.entryType")}
              onChange={(value) => {
                form.setValue(
                  "entryType",
                  (value as CreateSupplierLedgerEntryFormValues["entryType"] | undefined) ??
                    "INVOICE",
                );
              }}
            />
          </div>

          <div>
            <Label htmlFor="ledger-amount">{t("ledger.form.amount")}</Label>
            <Input
              id="ledger-amount"
              type="number"
              min={0.01}
              step="0.01"
              dir="ltr"
              {...form.register("amount", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined
                    ? undefined
                    : Number(value),
              })}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            checked={Boolean(increaseBalance)}
            onChange={(event) => form.setValue("increaseBalance", event.target.checked)}
          />
          {t("ledger.form.increaseBalance")}
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ledger-entry-date">{t("ledger.form.entryDate")}</Label>
            <Input id="ledger-entry-date" type="date" {...form.register("entryDate")} />
          </div>
          <div>
            <Label htmlFor="ledger-due-date">{t("ledger.form.dueDate")}</Label>
            <Input id="ledger-due-date" type="date" {...form.register("dueDate")} />
          </div>
        </div>

        <div>
          <Label htmlFor="ledger-note">{t("ledger.form.note")}</Label>
          <Input id="ledger-note" {...form.register("note")} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="danger" onClick={onClose} disabled={loading}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t("actions.saving") : t("ledger.actions.createEntry")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


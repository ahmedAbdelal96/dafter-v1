"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { Modal } from "@/components/ui/modal";
import type { CreateLedgerEntryRequest, PartyType } from "@/lib/api/types";
import {
  createLedgerEntrySchema,
  type CreateLedgerEntryFormValues,
  ENTRY_TYPE_VALUES,
} from "../utils/ledger-schemas";
import { toSignedAmount } from "../utils/ledger-format";

interface LedgerEntryCreateModalProps {
  open: boolean;
  loading: boolean;
  partyType: PartyType;
  partyId?: string;
  onClose: () => void;
  onSubmit: (payload: CreateLedgerEntryRequest) => Promise<void>;
}

export function LedgerEntryCreateModal({
  open,
  loading,
  partyType,
  partyId,
  onClose,
  onSubmit,
}: LedgerEntryCreateModalProps) {
  const t = useTranslations("ledger");

  const form = useForm<CreateLedgerEntryFormValues>({
    resolver: zodResolver(createLedgerEntrySchema),
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

  const entryTypeOptions = useMemo<ComboboxOption[]>(
    () =>
      ENTRY_TYPE_VALUES.map((entryTypeValue) => ({
        value: entryTypeValue,
        label: t(`entryTypes.${entryTypeValue}`),
      })),
    [t]
  );

  const resetForm = () => {
    form.reset({
      entryType: "INVOICE",
      amount: 0,
      increaseBalance: true,
      entryDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      note: "",
    });
  };

  const handleSubmit = async (values: CreateLedgerEntryFormValues) => {
    if (!partyId) {
      return;
    }

    await onSubmit({
      partyType,
      partyId,
      entryType: values.entryType,
      signedAmount: toSignedAmount(values.amount, values.increaseBalance),
      entryDate: values.entryDate,
      dueDate: values.dueDate || undefined,
      note: values.note || undefined,
    });

    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("modal.title")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("modal.description")}</p>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ledger-entry-type">{t("form.entryType")}</Label>
            <Combobox
              value={entryType}
              options={entryTypeOptions}
              searchable={false}
              placeholder={t("form.entryType")}
              searchPlaceholder={t("form.entryType")}
              onChange={(value) => {
                form.setValue(
                  "entryType",
                  (value as CreateLedgerEntryFormValues["entryType"] | undefined) ?? "INVOICE"
                );
              }}
            />
          </div>

          <div>
            <Label htmlFor="ledger-amount">{t("form.amount")}</Label>
            <Input
              id="ledger-amount"
              type="number"
              min={0.01}
              step="0.01"
              dir="ltr"
              {...form.register("amount", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined ? undefined : Number(value),
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
          {t("form.increaseBalance")}
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ledger-entry-date">{t("form.entryDate")}</Label>
            <Input id="ledger-entry-date" type="date" {...form.register("entryDate")} />
          </div>

          <div>
            <Label htmlFor="ledger-due-date">{t("form.dueDate")}</Label>
            <Input id="ledger-due-date" type="date" {...form.register("dueDate")} />
          </div>
        </div>

        <div>
          <Label htmlFor="ledger-note">{t("form.note")}</Label>
          <Input id="ledger-note" {...form.register("note")} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={loading}
          >
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={loading || !partyId}>
            {loading ? t("actions.saving") : t("actions.createEntry")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { Modal } from "@/components/ui/modal";
import type { CreateLedgerEntryRequest } from "@/lib/api/types";
import {
  createEmployeePayrollEntrySchema,
  type CreateEmployeePayrollEntryFormValues,
} from "../utils/employee-schemas";

interface EmployeePayrollEntryModalProps {
  open: boolean;
  loading: boolean;
  employeeId: string;
  initialType?: "SALARY_PAYMENT" | "ADVANCE" | "DEDUCTION";
  onClose: () => void;
  onSubmit: (payload: CreateLedgerEntryRequest) => Promise<void>;
}

function toSignedAmount(
  entryType: CreateEmployeePayrollEntryFormValues["entryType"],
  amount: number
) {
  return entryType === "SALARY_PAYMENT" ? amount : -amount;
}

export function EmployeePayrollEntryModal({
  open,
  loading,
  employeeId,
  initialType = "SALARY_PAYMENT",
  onClose,
  onSubmit,
}: EmployeePayrollEntryModalProps) {
  const t = useTranslations("employees");

  const form = useForm<CreateEmployeePayrollEntryFormValues>({
    resolver: zodResolver(createEmployeePayrollEntrySchema),
    defaultValues: {
      entryType: initialType,
      amount: 0,
      entryDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      note: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      entryType: initialType,
      amount: 0,
      entryDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      note: "",
    });
  }, [form, initialType, open]);

  const handleSubmit = async (values: CreateEmployeePayrollEntryFormValues) => {
    await onSubmit({
      partyType: "EMPLOYEE",
      partyId: employeeId,
      entryType: values.entryType,
      signedAmount: toSignedAmount(values.entryType, values.amount),
      entryDate: values.entryDate,
      dueDate: values.dueDate || undefined,
      note: values.note || undefined,
    });
  };

  const entryTypeOptions: ComboboxOption[] = [
    { value: "SALARY_PAYMENT", label: t("payroll.entryTypes.SALARY_PAYMENT") },
    { value: "ADVANCE", label: t("payroll.entryTypes.ADVANCE") },
    { value: "DEDUCTION", label: t("payroll.entryTypes.DEDUCTION") },
  ];

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("payroll.modal.title")}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t("payroll.modal.description")}
      </p>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div>
          <Label htmlFor="payroll-entry-type">{t("payroll.form.entryType")}</Label>
          <Combobox
            value={form.watch("entryType")}
            options={entryTypeOptions}
            searchable={false}
            placeholder={t("payroll.form.entryType")}
            searchPlaceholder={t("payroll.form.entryType")}
            onChange={(value) => {
              form.setValue(
                "entryType",
                (value as CreateEmployeePayrollEntryFormValues["entryType"] | undefined) ??
                  "SALARY_PAYMENT"
              );
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="payroll-amount">{t("payroll.form.amount")}</Label>
            <Input
              id="payroll-amount"
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
          <div>
            <Label htmlFor="payroll-entry-date">{t("payroll.form.entryDate")}</Label>
            <Input id="payroll-entry-date" type="date" {...form.register("entryDate")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="payroll-due-date">{t("payroll.form.dueDate")}</Label>
            <Input id="payroll-due-date" type="date" {...form.register("dueDate")} />
          </div>
          <div>
            <Label htmlFor="payroll-note">{t("payroll.form.note")}</Label>
            <Input id="payroll-note" {...form.register("note")} />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
          {t("payroll.form.signHint")}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="danger" onClick={onClose} disabled={loading}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t("actions.saving") : t("payroll.actions.createEntry")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { Modal } from "@/components/ui/modal";
import type { ExpenseCategoryValue } from "@/lib/api/types";
import { EXPENSE_CATEGORIES } from "../utils/expense-constants";
import {
  createExpenseSchema,
  type CreateExpenseFormValues,
} from "../utils/expense-schemas";

interface ExpenseCreateModalProps {
  open: boolean;
  loading: boolean;
  supplierOptions: ComboboxOption[];
  onClose: () => void;
  onSubmit: (values: CreateExpenseFormValues) => Promise<void>;
}

export function ExpenseCreateModal({
  open,
  loading,
  supplierOptions,
  onClose,
  onSubmit,
}: ExpenseCreateModalProps) {
  const t = useTranslations("expenses");
  const form = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      category: "OTHER",
      amount: 0,
      expenseDate: new Date().toISOString().split("T")[0],
      description: "",
      supplierId: "",
      referenceNumber: "",
      paymentMethod: "",
      notes: "",
    },
  });

  const category = useWatch({ control: form.control, name: "category" });
  const supplierId = useWatch({ control: form.control, name: "supplierId" });

  useEffect(() => {
    if (!open) return;
    form.reset({
      category: "OTHER",
      amount: 0,
      expenseDate: new Date().toISOString().split("T")[0],
      description: "",
      supplierId: "",
      referenceNumber: "",
      paymentMethod: "",
      notes: "",
    });
  }, [form, open]);

  const categoryOptions = useMemo<ComboboxOption[]>(
    () =>
      EXPENSE_CATEGORIES.map((value) => ({
        value,
        label: t(`categories.${value}`),
      })),
    [t]
  );

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-3xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("modal.createTitle")}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t("modal.createDescription")}
      </p>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="expense-category">{t("form.category")}</Label>
            <Combobox
              value={category}
              options={categoryOptions}
              searchable={false}
              placeholder={t("form.category")}
              searchPlaceholder={t("form.category")}
              onChange={(value) =>
                form.setValue("category", (value as ExpenseCategoryValue | undefined) ?? "OTHER")
              }
            />
          </div>

          <div>
            <Label htmlFor="expense-amount">{t("form.amount")}</Label>
            <Input
              id="expense-amount"
              type="number"
              step="0.01"
              min={0.01}
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
            <Label htmlFor="expense-date">{t("form.expenseDate")}</Label>
            <Input id="expense-date" type="date" {...form.register("expenseDate")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="expense-supplier">{t("form.supplier")}</Label>
            <Combobox
              value={supplierId || undefined}
              options={supplierOptions}
              searchable
              placeholder={t("form.supplier")}
              searchPlaceholder={t("filters.searchSupplier")}
              emptyText={t("filters.noSuppliers")}
              onChange={(value) => form.setValue("supplierId", value ?? "")}
            />
          </div>
          <div>
            <Label htmlFor="expense-payment-method">{t("form.paymentMethod")}</Label>
            <Input id="expense-payment-method" {...form.register("paymentMethod")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="expense-description">{t("form.description")}</Label>
            <Input id="expense-description" {...form.register("description")} />
          </div>
          <div>
            <Label htmlFor="expense-reference">{t("form.referenceNumber")}</Label>
            <Input id="expense-reference" {...form.register("referenceNumber")} />
          </div>
        </div>

        <div>
          <Label htmlFor="expense-notes">{t("form.notes")}</Label>
          <Input id="expense-notes" {...form.register("notes")} />
        </div>

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


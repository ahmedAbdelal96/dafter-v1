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
import type { ExpenseCategoryValue, ExpenseRecord } from "@/lib/api/types";
import { EXPENSE_CATEGORIES } from "../utils/expense-constants";
import { updateExpenseSchema, type UpdateExpenseFormValues } from "../utils/expense-schemas";

interface ExpenseEditModalProps {
  open: boolean;
  loading: boolean;
  expense: ExpenseRecord | null;
  supplierOptions: ComboboxOption[];
  onClose: () => void;
  onSubmit: (values: UpdateExpenseFormValues) => Promise<void>;
}

export function ExpenseEditModal({
  open,
  loading,
  expense,
  supplierOptions,
  onClose,
  onSubmit,
}: ExpenseEditModalProps) {
  const t = useTranslations("expenses");
  const form = useForm<UpdateExpenseFormValues>({
    resolver: zodResolver(updateExpenseSchema),
    defaultValues: {
      category: "OTHER",
      amount: undefined,
      expenseDate: "",
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
    if (!expense) return;

    form.reset({
      category: expense.category,
      amount: Number(expense.amount),
      expenseDate: expense.expenseDate?.split("T")[0] ?? "",
      description: expense.description ?? "",
      supplierId: expense.supplierId ?? "",
      referenceNumber: expense.referenceNumber ?? "",
      paymentMethod: expense.paymentMethod ?? "",
      notes: expense.notes ?? "",
    });
  }, [expense, form]);

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
        {t("modal.editTitle")}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t("modal.editDescription")}
      </p>

      {!expense && loading ? (
        <div className="py-8 text-sm text-gray-500">{t("actions.loading")}</div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="edit-expense-category">{t("form.category")}</Label>
              <Combobox
                value={category}
                options={categoryOptions}
                searchable={false}
                placeholder={t("form.category")}
                searchPlaceholder={t("form.category")}
                onChange={(value) =>
                  form.setValue(
                    "category",
                    (value as ExpenseCategoryValue | undefined) ?? "OTHER"
                  )
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-expense-amount">{t("form.amount")}</Label>
              <Input
                id="edit-expense-amount"
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
              <Label htmlFor="edit-expense-date">{t("form.expenseDate")}</Label>
              <Input id="edit-expense-date" type="date" {...form.register("expenseDate")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="edit-expense-supplier">{t("form.supplier")}</Label>
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
              <Label htmlFor="edit-expense-payment-method">{t("form.paymentMethod")}</Label>
              <Input id="edit-expense-payment-method" {...form.register("paymentMethod")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="edit-expense-description">{t("form.description")}</Label>
              <Input id="edit-expense-description" {...form.register("description")} />
            </div>
            <div>
              <Label htmlFor="edit-expense-reference">{t("form.referenceNumber")}</Label>
              <Input id="edit-expense-reference" {...form.register("referenceNumber")} />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-expense-notes">{t("form.notes")}</Label>
            <Input id="edit-expense-notes" {...form.register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="danger" onClick={onClose} disabled={loading}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("actions.saving") : t("actions.save")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}


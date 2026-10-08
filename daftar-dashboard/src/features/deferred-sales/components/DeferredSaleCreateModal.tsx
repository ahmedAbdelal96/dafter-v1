"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { Modal } from "@/components/ui/modal";
import type { CreateDeferredSaleRequest, PartyType } from "@/lib/api/types";
import { deferredSaleCreateSchema, type DeferredSaleCreateFormValues } from "../utils/deferred-sales-schemas";

interface DeferredSaleCreateModalProps {
  open: boolean;
  loading: boolean;
  partyOptions: ComboboxOption[];
  onClose: () => void;
  onSubmit: (payload: CreateDeferredSaleRequest) => Promise<void>;
}

export function DeferredSaleCreateModal({
  open,
  loading,
  partyOptions,
  onClose,
  onSubmit,
}: DeferredSaleCreateModalProps) {
  const t = useTranslations("deferred-sales");

  const form = useForm<DeferredSaleCreateFormValues>({
    resolver: zodResolver(deferredSaleCreateSchema),
    defaultValues: {
      partyType: "CUSTOMER",
      partyId: "",
      totalAmount: 0,
      dueDate: new Date().toISOString().split("T")[0],
      entryDate: new Date().toISOString().split("T")[0],
      description: "",
      expectedPaymentMethod: "",
    },
  });

  const partyType = form.watch("partyType");

  const partyTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "CUSTOMER", label: t("filters.partyTypeCustomer") },
      { value: "SUPPLIER", label: t("filters.partyTypeSupplier") },
      { value: "EMPLOYEE", label: t("filters.partyTypeEmployee") },
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

  const handleSubmit = async (values: DeferredSaleCreateFormValues) => {
    await onSubmit({
      partyType: values.partyType,
      partyId: values.partyId,
      totalAmount: values.totalAmount,
      dueDate: values.dueDate,
      entryDate: values.entryDate || undefined,
      description: values.description || undefined,
      expectedPaymentMethod: values.expectedPaymentMethod || undefined,
    });
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-3xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("createModal.title")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("createModal.description")}</p>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="ds-total">{t("form.totalAmount")}</Label>
            <Input
              id="ds-total"
              type="number"
              min={0.01}
              step="0.01"
              dir="ltr"
              error={!!form.formState.errors.totalAmount}
              hint={form.formState.errors.totalAmount?.message}
              {...form.register("totalAmount", { setValueAs: (v) => Number(v) })}
            />
          </div>
          <div>
            <Label htmlFor="ds-entry-date">{t("form.entryDate")}</Label>
            <Input
              id="ds-entry-date"
              type="date"
              error={!!form.formState.errors.entryDate}
              hint={form.formState.errors.entryDate?.message}
              {...form.register("entryDate")}
            />
          </div>
          <div>
            <Label htmlFor="ds-due-date">{t("form.dueDate")}</Label>
            <Input
              id="ds-due-date"
              type="date"
              error={!!form.formState.errors.dueDate}
              hint={form.formState.errors.dueDate?.message}
              {...form.register("dueDate")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ds-method">{t("form.expectedPaymentMethod")}</Label>
            <Input id="ds-method" {...form.register("expectedPaymentMethod")} />
          </div>
          <div>
            <Label htmlFor="ds-description">{t("form.description")}</Label>
            <Input id="ds-description" {...form.register("description")} />
          </div>
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


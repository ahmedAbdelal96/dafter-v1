"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import {
  createSupplierSchema,
  type CreateSupplierFormValues,
} from "../utils/supplier-schemas";

interface SupplierCreateModalProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: CreateSupplierFormValues) => Promise<void>;
}

export function SupplierCreateModal({
  open,
  loading,
  onClose,
  onSubmit,
}: SupplierCreateModalProps) {
  const t = useTranslations("suppliers");

  const form = useForm<CreateSupplierFormValues>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      openingBalance: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: "",
      phone: "",
      address: "",
      openingBalance: 0,
    });
  }, [open, form]);

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("modal.createTitle")}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t("modal.createDescription")}
      </p>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <Label htmlFor="supplier-name">{t("form.name")}</Label>
          <Input
            id="supplier-name"
            {...form.register("name")}
            error={Boolean(form.formState.errors.name)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="supplier-phone">{t("form.phone")}</Label>
            <Input id="supplier-phone" dir="ltr" {...form.register("phone")} />
          </div>
          <div>
            <Label htmlFor="supplier-opening-balance">{t("form.openingBalance")}</Label>
            <Input
              id="supplier-opening-balance"
              type="number"
              step="0.01"
              dir="ltr"
              {...form.register("openingBalance", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined
                    ? undefined
                    : Number(value),
              })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="supplier-address">{t("form.address")}</Label>
          <Input id="supplier-address" {...form.register("address")} />
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


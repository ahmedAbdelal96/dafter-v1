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
  createCustomerSchema,
  type CreateCustomerFormValues,
} from "../utils/customer-schemas";

interface CustomerCreateModalProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: CreateCustomerFormValues) => Promise<void>;
}

export function CustomerCreateModal({
  open,
  loading,
  onClose,
  onSubmit,
}: CustomerCreateModalProps) {
  const t = useTranslations("customers");

  const form = useForm<CreateCustomerFormValues>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      openingBalance: 0,
      creditLimit: undefined,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: "",
      phone: "",
      address: "",
      openingBalance: 0,
      creditLimit: undefined,
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
          <Label htmlFor="customer-name">{t("form.name")}</Label>
          <Input
            id="customer-name"
            {...form.register("name")}
            error={Boolean(form.formState.errors.name)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="customer-phone">{t("form.phone")}</Label>
            <Input id="customer-phone" dir="ltr" {...form.register("phone")} />
          </div>
          <div>
            <Label htmlFor="customer-opening-balance">{t("form.openingBalance")}</Label>
            <Input
              id="customer-opening-balance"
              type="number"
              min={0}
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
          <Label htmlFor="customer-address">{t("form.address")}</Label>
          <Input id="customer-address" {...form.register("address")} />
        </div>

        <div>
          <Label htmlFor="customer-credit-limit">{t("form.creditLimit")}</Label>
          <Input
            id="customer-credit-limit"
            type="number"
            min={0}
            step="0.01"
            dir="ltr"
            {...form.register("creditLimit", {
              setValueAs: (value) =>
                value === "" || value === null || value === undefined
                  ? undefined
                  : Number(value),
            })}
          />
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


"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import type { Customer } from "@/lib/api/types";
import { toNumber } from "../utils/customer-format";
import {
  updateCustomerSchema,
  type UpdateCustomerFormValues,
} from "../utils/customer-schemas";

interface CustomerEditModalProps {
  open: boolean;
  customer: Customer | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: UpdateCustomerFormValues) => Promise<void>;
}

export function CustomerEditModal({
  open,
  customer,
  loading,
  onClose,
  onSubmit,
}: CustomerEditModalProps) {
  const t = useTranslations("customers");
  const form = useForm<UpdateCustomerFormValues>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      creditLimit: undefined,
      isActive: true,
    },
  });
  const isActive = useWatch({ control: form.control, name: "isActive" });

  useEffect(() => {
    if (!customer) return;
    form.reset({
      name: customer.name ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      creditLimit:
        customer.creditLimit === null || customer.creditLimit === undefined
          ? undefined
          : toNumber(customer.creditLimit),
      isActive: customer.isActive,
    });
  }, [customer, form]);

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("modal.editTitle")}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t("modal.editDescription")}
      </p>

      {!customer && loading ? (
        <div className="py-8 text-sm text-gray-500">{t("actions.loading")}</div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="edit-customer-name">{t("form.name")}</Label>
            <Input id="edit-customer-name" {...form.register("name")} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="edit-customer-phone">{t("form.phone")}</Label>
              <Input id="edit-customer-phone" dir="ltr" {...form.register("phone")} />
            </div>
            <div>
              <Label htmlFor="edit-customer-credit-limit">{t("form.creditLimit")}</Label>
              <Input
                id="edit-customer-credit-limit"
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
          </div>

          <div>
            <Label htmlFor="edit-customer-address">{t("form.address")}</Label>
            <Input id="edit-customer-address" {...form.register("address")} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={Boolean(isActive)}
              onChange={(event) => form.setValue("isActive", event.target.checked)}
            />
            {t("form.isActive")}
          </label>

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


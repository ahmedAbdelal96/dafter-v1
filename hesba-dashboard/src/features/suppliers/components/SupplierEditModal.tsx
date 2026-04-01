"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import type { Supplier } from "@/lib/api/types";
import {
  updateSupplierSchema,
  type UpdateSupplierFormValues,
} from "../utils/supplier-schemas";

interface SupplierEditModalProps {
  open: boolean;
  supplier: Supplier | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: UpdateSupplierFormValues) => Promise<void>;
}

export function SupplierEditModal({
  open,
  supplier,
  loading,
  onClose,
  onSubmit,
}: SupplierEditModalProps) {
  const t = useTranslations("suppliers");
  const form = useForm<UpdateSupplierFormValues>({
    resolver: zodResolver(updateSupplierSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      isActive: true,
    },
  });
  const isActive = useWatch({ control: form.control, name: "isActive" });

  useEffect(() => {
    if (!supplier) return;
    form.reset({
      name: supplier.name ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      isActive: supplier.isActive,
    });
  }, [supplier, form]);

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("modal.editTitle")}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t("modal.editDescription")}
      </p>

      {!supplier && loading ? (
        <div className="py-8 text-sm text-gray-500">{t("actions.loading")}</div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="edit-supplier-name">{t("form.name")}</Label>
            <Input id="edit-supplier-name" {...form.register("name")} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="edit-supplier-phone">{t("form.phone")}</Label>
              <Input id="edit-supplier-phone" dir="ltr" {...form.register("phone")} />
            </div>
            <div>
              <Label htmlFor="edit-supplier-address">{t("form.address")}</Label>
              <Input id="edit-supplier-address" {...form.register("address")} />
            </div>
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


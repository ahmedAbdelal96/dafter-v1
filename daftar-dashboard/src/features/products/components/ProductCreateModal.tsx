"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import {
  createProductSchema,
  type CreateProductFormValues,
} from "../utils/product-schemas";

interface ProductCreateModalProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: CreateProductFormValues) => Promise<void>;
}

export function ProductCreateModal({
  open,
  loading,
  onClose,
  onSubmit,
}: ProductCreateModalProps) {
  const t = useTranslations("products");

  const form = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      category: "",
      unit: "",
      unitPrice: 0,
      isActive: true,
    },
  });

  const isActive = useWatch({ control: form.control, name: "isActive" });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: "",
      description: "",
      sku: "",
      category: "",
      unit: "",
      unitPrice: 0,
      isActive: true,
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
          <Label htmlFor="product-name">{t("form.name")}</Label>
          <Input id="product-name" {...form.register("name")} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="product-sku">{t("form.sku")}</Label>
            <Input id="product-sku" dir="ltr" {...form.register("sku")} />
          </div>
          <div>
            <Label htmlFor="product-category">{t("form.category")}</Label>
            <Input id="product-category" {...form.register("category")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="product-unit">{t("form.unit")}</Label>
            <Input id="product-unit" {...form.register("unit")} />
          </div>
          <div>
            <Label htmlFor="product-unit-price">{t("form.unitPrice")}</Label>
            <Input
              id="product-unit-price"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              {...form.register("unitPrice", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined
                    ? undefined
                    : Number(value),
              })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="product-description">{t("form.description")}</Label>
          <Input id="product-description" {...form.register("description")} />
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
            {loading ? t("actions.saving") : t("actions.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


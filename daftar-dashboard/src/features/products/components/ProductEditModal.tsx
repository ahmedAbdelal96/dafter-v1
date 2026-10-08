"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import type { Product } from "@/lib/api/types";
import { toNumber } from "../utils/product-format";
import {
  updateProductSchema,
  type UpdateProductFormValues,
} from "../utils/product-schemas";

interface ProductEditModalProps {
  open: boolean;
  product: Product | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: UpdateProductFormValues) => Promise<void>;
}

export function ProductEditModal({
  open,
  product,
  loading,
  onClose,
  onSubmit,
}: ProductEditModalProps) {
  const t = useTranslations("products");
  const form = useForm<UpdateProductFormValues>({
    resolver: zodResolver(updateProductSchema),
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
    if (!product) return;
    form.reset({
      name: product.name ?? "",
      description: product.description ?? "",
      sku: product.sku ?? "",
      category: product.category ?? "",
      unit: product.unit ?? "",
      unitPrice: toNumber(product.unitPrice),
      isActive: product.isActive,
    });
  }, [product, form]);

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("modal.editTitle")}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t("modal.editDescription")}
      </p>

      {!product && loading ? (
        <div className="py-8 text-sm text-gray-500">{t("actions.loading")}</div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="edit-product-name">{t("form.name")}</Label>
            <Input id="edit-product-name" {...form.register("name")} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="edit-product-sku">{t("form.sku")}</Label>
              <Input id="edit-product-sku" dir="ltr" {...form.register("sku")} />
            </div>
            <div>
              <Label htmlFor="edit-product-category">{t("form.category")}</Label>
              <Input id="edit-product-category" {...form.register("category")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="edit-product-unit">{t("form.unit")}</Label>
              <Input id="edit-product-unit" {...form.register("unit")} />
            </div>
            <div>
              <Label htmlFor="edit-product-unit-price">{t("form.unitPrice")}</Label>
              <Input
                id="edit-product-unit-price"
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
            <Label htmlFor="edit-product-description">{t("form.description")}</Label>
            <Input id="edit-product-description" {...form.register("description")} />
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


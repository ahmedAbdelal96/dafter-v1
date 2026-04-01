"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useProducts } from "@/lib/api/hooks/use-products";
import type { CreateInvoiceRequest } from "@/lib/api/types";
import { formatMoney } from "../utils/supplier-format";
import {
  createSupplierInvoiceSchema,
  type CreateSupplierInvoiceFormValues,
} from "../utils/supplier-invoice-schemas";

interface SupplierInvoiceCreateModalProps {
  open: boolean;
  loading: boolean;
  supplierId: string;
  supplierAddress?: string;
  initialPayload?: Omit<CreateInvoiceRequest, "partyType" | "partyId"> | null;
  onClose: () => void;
  onSubmit: (payload: CreateInvoiceRequest) => Promise<void>;
}

function toNumber(value: number | string | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  const normalized = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(normalized)) return 0;
  return normalized;
}

function toFormDefaults(
  supplierAddress?: string,
  initialPayload?: Omit<CreateInvoiceRequest, "partyType" | "partyId"> | null
): CreateSupplierInvoiceFormValues {
  if (!initialPayload) {
    return {
      issueDate: new Date().toISOString().split("T")[0],
      partyAddress: supplierAddress ?? "",
      taxAmount: 0,
      notes: "",
      items: [{ productId: "", description: "", quantity: 1, unitPrice: 0 }],
    };
  }

  return {
    issueDate: initialPayload.issueDate,
    partyAddress: initialPayload.partyAddress || supplierAddress || "",
    taxAmount: initialPayload.taxAmount ?? 0,
    notes: initialPayload.notes || "",
    items:
      initialPayload.items.length > 0
        ? initialPayload.items.map((item) => ({
            productId: item.productId || "",
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }))
        : [{ productId: "", description: "", quantity: 1, unitPrice: 0 }],
  };
}

export function SupplierInvoiceCreateModal({
  open,
  loading,
  supplierId,
  supplierAddress,
  initialPayload,
  onClose,
  onSubmit,
}: SupplierInvoiceCreateModalProps) {
  const t = useTranslations("suppliers");
  const locale = useLocale();
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebouncedValue(productSearch, 250);

  const productsQuery = useProducts({
    page: 1,
    limit: 50,
    isActive: true,
    search: debouncedProductSearch || undefined,
  });

  const productsById = useMemo(() => {
    return new Map((productsQuery.data?.items ?? []).map((product) => [product.id, product]));
  }, [productsQuery.data?.items]);

  const productOptions = useMemo<ComboboxOption[]>(() => {
    return (productsQuery.data?.items ?? []).map((product) => ({
      value: product.id,
      label: product.name,
      description: formatMoney(toNumber(product.unitPrice), locale),
      keywords: [product.sku ?? "", product.category ?? "", product.description ?? ""],
    }));
  }, [locale, productsQuery.data?.items]);

  const form = useForm<CreateSupplierInvoiceFormValues>({
    resolver: zodResolver(createSupplierInvoiceSchema),
    defaultValues: toFormDefaults(supplierAddress, initialPayload),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({ control: form.control, name: "items" });
  const watchedTax = useWatch({ control: form.control, name: "taxAmount" });

  const subtotal = useMemo(() => {
    return (watchedItems ?? []).reduce((acc, item) => {
      return acc + toNumber(item?.quantity) * toNumber(item?.unitPrice);
    }, 0);
  }, [watchedItems]);

  const total = subtotal + toNumber(watchedTax);

  useEffect(() => {
    if (!open) return;
    form.reset(toFormDefaults(supplierAddress, initialPayload));
  }, [form, initialPayload, open, supplierAddress]);

  const handleSubmit = async (values: CreateSupplierInvoiceFormValues) => {
    await onSubmit({
      partyType: "SUPPLIER",
      partyId: supplierId,
      issueDate: values.issueDate,
      partyAddress: values.partyAddress || undefined,
      taxAmount: toNumber(values.taxAmount),
      notes: values.notes || undefined,
      items: values.items.map((item) => ({
        productId: item.productId || undefined,
        description: item.description.trim(),
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
      })),
    });

    form.reset(toFormDefaults(supplierAddress, null));
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-4xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("purchases.modal.title")}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t("purchases.modal.description")}
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={form.handleSubmit(handleSubmit)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
            event.preventDefault();
            append({ productId: "", description: "", quantity: 1, unitPrice: 0 });
          }
        }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="invoice-issue-date">{t("purchases.form.issueDate")}</Label>
            <Input id="invoice-issue-date" type="date" {...form.register("issueDate")} />
          </div>

          <div>
            <Label htmlFor="invoice-tax">{t("purchases.form.taxAmount")}</Label>
            <Input
              id="invoice-tax"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              {...form.register("taxAmount", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined
                    ? undefined
                    : Number(value),
              })}
            />
          </div>

          <div>
            <Label htmlFor="invoice-party-address">{t("purchases.form.partyAddress")}</Label>
            <Input id="invoice-party-address" {...form.register("partyAddress")} />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {t("purchases.form.items")}
            </h3>
            <Button
              type="button"
              variant="outline"
              startIcon={<Plus size={16} />}
              onClick={() =>
                append({ productId: "", description: "", quantity: 1, unitPrice: 0 })
              }
            >
              {t("purchases.actions.addItem")}
            </Button>
          </div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t("purchases.modal.keyboardHint")}</p>

          <div className="space-y-2">
            {fields.map((field, index) => {
              const row = watchedItems?.[index];
              const rowTotal = toNumber(row?.quantity) * toNumber(row?.unitPrice);

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800 md:grid-cols-12"
                >
                  <div className="md:col-span-4">
                    <Combobox
                      value={row?.productId || undefined}
                      options={productOptions}
                      placeholder={t("purchases.form.product")}
                      searchPlaceholder={t("purchases.form.searchProduct")}
                      emptyText={t("purchases.form.noProducts")}
                      loadingText={t("actions.loading")}
                      loading={productsQuery.isFetching}
                      onSearchChange={setProductSearch}
                      onChange={(productId) => {
                        const selectedProduct = productId ? productsById.get(productId) : undefined;

                        form.setValue(`items.${index}.productId`, productId ?? "");
                        if (!selectedProduct) return;

                        form.setValue(`items.${index}.description`, selectedProduct.name, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        form.setValue(
                          `items.${index}.unitPrice`,
                          toNumber(selectedProduct.unitPrice),
                          { shouldDirty: true, shouldValidate: true },
                        );
                      }}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      placeholder={t("purchases.form.description")}
                      {...form.register(`items.${index}.description`)}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      type="number"
                      min={0.001}
                      step="0.001"
                      dir="ltr"
                      placeholder={t("purchases.form.quantity")}
                      {...form.register(`items.${index}.quantity`, {
                        setValueAs: (value) =>
                          value === "" || value === null || value === undefined
                            ? undefined
                            : Number(value),
                      })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      dir="ltr"
                      placeholder={t("purchases.form.unitPrice")}
                      {...form.register(`items.${index}.unitPrice`, {
                        setValueAs: (value) =>
                          value === "" || value === null || value === undefined
                            ? undefined
                            : Number(value),
                      })}
                    />
                  </div>
                  <div className="flex items-center text-sm font-medium text-gray-800 dark:text-gray-100 md:col-span-1">
                    {formatMoney(rowTotal, locale)}
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      className="rounded-md p-2 text-error-500 transition hover:bg-error-50 dark:hover:bg-error-500/10"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="invoice-notes">{t("purchases.form.notes")}</Label>
          <Input id="invoice-notes" {...form.register("notes")} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex items-center justify-between">
            <span>{t("purchases.summary.subtotal")}</span>
            <span className="font-medium">{formatMoney(subtotal, locale)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span>{t("purchases.summary.tax")}</span>
            <span className="font-medium">{formatMoney(toNumber(watchedTax), locale)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 font-semibold dark:border-gray-700">
            <span>{t("purchases.summary.total")}</span>
            <span>{formatMoney(total, locale)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="danger" onClick={onClose} disabled={loading}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t("actions.saving") : t("purchases.actions.createInvoice")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


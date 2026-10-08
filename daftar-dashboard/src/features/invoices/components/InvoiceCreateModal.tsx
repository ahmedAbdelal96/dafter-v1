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
import { useCustomers } from "@/lib/api/hooks/use-customers";
import { useProducts } from "@/lib/api/hooks/use-products";
import { useSuppliers } from "@/lib/api/hooks/use-suppliers";
import { API_LIMITS } from "@/lib/api/config";
import type { CreateInvoiceRequest } from "@/lib/api/types";
import { formatMoney, toNumber } from "../utils/invoice-format";
import { createInvoiceSchema, type CreateInvoiceFormValues } from "../utils/invoice-schemas";

interface InvoiceCreateModalProps {
  open: boolean;
  loading: boolean;
  canApproveDirect?: boolean;
  initialPayload?: CreateInvoiceRequest | null;
  onClose: () => void;
  onSubmitDraft: (payload: CreateInvoiceRequest) => Promise<void>;
  onSubmitAndApprove?: (payload: CreateInvoiceRequest) => Promise<void>;
}

function toFormDefaults(initialPayload?: CreateInvoiceRequest | null): CreateInvoiceFormValues {
  if (!initialPayload) {
    return {
      partyType: "CUSTOMER",
      partyId: "",
      issueDate: new Date().toISOString().split("T")[0],
      partyAddress: "",
      taxAmount: 0,
      notes: "",
      items: [{ productId: "", description: "", quantity: 1, unitPrice: 0 }],
    };
  }

  return {
    partyType: initialPayload.partyType === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER",
    partyId: initialPayload.partyId,
    issueDate: initialPayload.issueDate,
    partyAddress: initialPayload.partyAddress || "",
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

export function InvoiceCreateModal({
  open,
  loading,
  canApproveDirect = false,
  initialPayload,
  onClose,
  onSubmitDraft,
  onSubmitAndApprove,
}: InvoiceCreateModalProps) {
  const t = useTranslations("invoices");
  const locale = useLocale();
  const [partySearch, setPartySearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const debouncedPartySearch = useDebouncedValue(partySearch, 300);
  const debouncedProductSearch = useDebouncedValue(productSearch, 250);

  const form = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: toFormDefaults(initialPayload),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const partyType = useWatch({ control: form.control, name: "partyType" });
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const watchedTaxAmount = useWatch({ control: form.control, name: "taxAmount" });

  const customersQuery = useCustomers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: partyType === "CUSTOMER" ? debouncedPartySearch || undefined : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const suppliersQuery = useSuppliers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: partyType === "SUPPLIER" ? debouncedPartySearch || undefined : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const productsQuery = useProducts({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: debouncedProductSearch || undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const activePartyOptions = useMemo<ComboboxOption[]>(() => {
    if (partyType === "SUPPLIER") {
      return (suppliersQuery.data?.items ?? []).map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
        description: supplier.phone || undefined,
        keywords: [supplier.phone || "", supplier.address || ""],
      }));
    }

    return (customersQuery.data?.items ?? []).map((customer) => ({
      value: customer.id,
      label: customer.name,
      description: customer.phone || undefined,
      keywords: [customer.phone || "", customer.address || ""],
    }));
  }, [customersQuery.data?.items, partyType, suppliersQuery.data?.items]);

  const productsById = useMemo(
    () => new Map((productsQuery.data?.items ?? []).map((product) => [product.id, product])),
    [productsQuery.data?.items]
  );

  const productOptions = useMemo<ComboboxOption[]>(
    () =>
      (productsQuery.data?.items ?? []).map((product) => ({
        value: product.id,
        label: product.name,
        description: formatMoney(product.unitPrice, locale),
        keywords: [product.sku ?? "", product.category ?? "", product.description ?? ""],
      })),
    [locale, productsQuery.data?.items]
  );

  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, item) => sum + toNumber(item?.quantity) * toNumber(item?.unitPrice),
        0
      ),
    [watchedItems]
  );
  const total = subtotal + toNumber(watchedTaxAmount);

  useEffect(() => {
    if (!open) return;
    form.reset(toFormDefaults(initialPayload));
  }, [form, initialPayload, open]);

  const buildPayload = (values: CreateInvoiceFormValues): CreateInvoiceRequest => ({
      partyType: values.partyType,
      partyId: values.partyId,
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

  const handleDraftSubmit = async (values: CreateInvoiceFormValues) => {
    await onSubmitDraft(buildPayload(values));

    form.reset(toFormDefaults(null));
  };

  const handleApproveSubmit = async (values: CreateInvoiceFormValues) => {
    if (!onSubmitAndApprove) return;
    await onSubmitAndApprove(buildPayload(values));

    form.reset(toFormDefaults(null));
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-5xl p-6">
      <h2 className="text-xl font-semibold text-text-primary">{t("createModal.title")}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t("createModal.description")}</p>
      {canApproveDirect ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t("createModal.approvalHint")}</p>
      ) : null}

      <form
        className="mt-5 space-y-4"
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
            event.preventDefault();
            append({ productId: "", description: "", quantity: 1, unitPrice: 0 });
          }
        }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <Label>{t("form.partyType")}</Label>
            <Combobox
              value={partyType}
              options={[
                { value: "CUSTOMER", label: t("filters.partyTypeCustomer") },
                { value: "SUPPLIER", label: t("filters.partyTypeSupplier") },
              ]}
              searchable={false}
              placeholder={t("form.partyType")}
              searchPlaceholder={t("form.partyType")}
              onChange={(value) => {
                form.setValue(
                  "partyType",
                  (value as CreateInvoiceFormValues["partyType"]) ?? "CUSTOMER"
                );
                form.setValue("partyId", "");
                setPartySearch("");
              }}
            />
          </div>

          <div>
            <Label>{t("form.party")}</Label>
            <Combobox
              value={form.watch("partyId") || undefined}
              options={activePartyOptions}
              placeholder={t("form.party")}
              searchPlaceholder={t("form.searchParty")}
              emptyText={t("form.noParties")}
              loadingText={t("actions.loading")}
              loading={customersQuery.isFetching || suppliersQuery.isFetching}
              onSearchChange={setPartySearch}
              onChange={(value) => form.setValue("partyId", value ?? "", { shouldValidate: true })}
            />
            {form.formState.errors.partyId && (
              <p className="mt-1 text-xs text-error-600 dark:text-error-400">{form.formState.errors.partyId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="invoice-issue-date">{t("form.issueDate")}</Label>
            <Input
              id="invoice-issue-date"
              type="date"
              error={!!form.formState.errors.issueDate}
              hint={form.formState.errors.issueDate?.message}
              {...form.register("issueDate")}
            />
          </div>

          <div>
            <Label htmlFor="invoice-tax">{t("form.taxAmount")}</Label>
            <Input
              id="invoice-tax"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              {...form.register("taxAmount", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined ? undefined : Number(value),
              })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="invoice-party-address">{t("form.partyAddress")}</Label>
            <Input id="invoice-party-address" {...form.register("partyAddress")} />
          </div>
          <div>
            <Label htmlFor="invoice-notes">{t("form.notes")}</Label>
            <Input id="invoice-notes" {...form.register("notes")} />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{t("form.items")}</h3>
            <Button
              type="button"
              variant="outline"
              startIcon={<Plus size={16} />}
              onClick={() => append({ productId: "", description: "", quantity: 1, unitPrice: 0 })}
            >
              {t("actions.addItem")}
            </Button>
          </div>
          <p className="mb-2 text-xs text-text-muted">{t("createModal.keyboardHint")}</p>

          <div className="space-y-2">
            {fields.map((field, index) => {
              const row = watchedItems?.[index];
              const rowTotal = toNumber(row?.quantity) * toNumber(row?.unitPrice);

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-border-light p-3 dark:border-border-strong md:grid-cols-12"
                >
                  <div className="md:col-span-4">
                    <Combobox
                      value={row?.productId || undefined}
                      options={productOptions}
                      placeholder={t("form.product")}
                      searchPlaceholder={t("form.searchProduct")}
                      emptyText={t("form.noProducts")}
                      loadingText={t("actions.loading")}
                      loading={productsQuery.isFetching}
                      onSearchChange={setProductSearch}
                      onChange={(productId) => {
                        form.setValue(`items.${index}.productId`, productId ?? "");
                        if (!productId) return;

                        const selectedProduct = productsById.get(productId);
                        if (!selectedProduct) return;

                        form.setValue(`items.${index}.description`, selectedProduct.name, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        form.setValue(`items.${index}.unitPrice`, toNumber(selectedProduct.unitPrice), {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Input placeholder={t("form.description")} {...form.register(`items.${index}.description`)} />
                  </div>

                  <div className="md:col-span-1">
                    <Input
                      type="number"
                      min={0.001}
                      step="0.001"
                      dir="ltr"
                      placeholder={t("form.quantity")}
                      {...form.register(`items.${index}.quantity`, {
                        setValueAs: (value) =>
                          value === "" || value === null || value === undefined ? undefined : Number(value),
                      })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      dir="ltr"
                      placeholder={t("form.unitPrice")}
                      {...form.register(`items.${index}.unitPrice`, {
                        setValueAs: (value) =>
                          value === "" || value === null || value === undefined ? undefined : Number(value),
                      })}
                    />
                  </div>

                  <div className="flex items-center text-sm font-medium text-text-primary md:col-span-1">
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

        {form.formState.errors.items?.root && (
          <p className="text-xs text-error-600 dark:text-error-400">{form.formState.errors.items.root.message}</p>
        )}

        <div className="rounded-xl border border-border-light bg-surface-tertiary p-3 text-sm dark:border-border-strong dark:bg-surface-tertiary">
          <div className="flex items-center justify-between">
            <span>{t("summary.subtotal")}</span>
            <span className="font-medium">{formatMoney(subtotal, locale)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span>{t("summary.tax")}</span>
            <span className="font-medium">{formatMoney(watchedTaxAmount, locale)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 font-semibold dark:border-gray-700">
            <span>{t("summary.total")}</span>
            <span>{formatMoney(total, locale)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="danger" onClick={onClose} disabled={loading}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={form.handleSubmit(handleDraftSubmit)}
          >
            {loading ? t("actions.creating") : t("actions.saveDraft")}
          </Button>
          {canApproveDirect ? (
            <Button
              type="button"
              disabled={loading}
              onClick={form.handleSubmit(handleApproveSubmit)}
            >
              {loading ? t("actions.creating") : t("actions.saveAndApprove")}
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}

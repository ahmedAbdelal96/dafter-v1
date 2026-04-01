"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { QueryState } from "@/components/common/QueryState";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import {
  useCreateAndApproveInvoice,
  useCreateInvoice,
  useDeleteInvoice,
  useInvoices,
} from "@/lib/api/hooks/use-invoices";
import { invoicesKeys } from "@/lib/api/hooks/query-keys";
import { invoicesApi } from "@/lib/api/services";
import type { CreateInvoiceRequest } from "@/lib/api/types";
import { formatMoney } from "../utils/customer-format";
import { CustomerInvoiceCreateModal } from "./CustomerInvoiceCreateModal";

interface CustomerSalesInvoicesSectionProps {
  customerId: string;
  customerAddress?: string;
}

export function CustomerSalesInvoicesSection({
  customerId,
  customerAddress,
}: CustomerSalesInvoicesSectionProps) {
  const t = useTranslations("customers");
  const tInvoiceStatus = useTranslations("invoices.status");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { handleApiError, showSuccess } = useErrorHandler();
  const { hasPermission, hasRole } = usePermission();

  const canView = hasPermission("invoices:view");
  const canCreate = hasPermission("invoices:create");
  const canApproveDirect = hasPermission("approveInvoice");
  const canDelete = hasPermission("invoices:delete") && hasRole("OWNER");

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const effectiveSearch = searchInput === "" ? "" : debouncedSearch;
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialInvoiceDraft, setInitialInvoiceDraft] = useState<
    Omit<CreateInvoiceRequest, "partyType" | "partyId"> | null
  >(null);

  const filters = useMemo(
    () => ({
      partyType: "CUSTOMER" as const,
      partyId: customerId,
      search: effectiveSearch || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit,
      sortBy: "issueDate",
      sortOrder: "desc" as const,
    }),
    [customerId, effectiveSearch, dateFrom, dateTo, page, limit]
  );

  const invoicesQuery = useInvoices(filters, canView);
  const createInvoiceMutation = useCreateInvoice();
  const createAndApproveInvoiceMutation = useCreateAndApproveInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();

  const invoices = invoicesQuery.data?.items ?? [];
  const meta = invoicesQuery.data?.meta ?? {
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    [locale]
  );
  const limitOptions = useMemo<ComboboxOption[]>(
    () =>
      [10, 20, 50].map((count) => ({
        value: String(count),
        label: String(count),
      })),
    [],
  );

  const resetFiltersToDefault = () => {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleCreateInvoice = async (payload: CreateInvoiceRequest) => {
    try {
      await createInvoiceMutation.mutateAsync(payload);
      resetFiltersToDefault();
      await queryClient.invalidateQueries({
        queryKey: invoicesKeys.lists(),
        refetchType: "active",
      });
      showSuccess(t("sales.messages.createSuccess"));
      setIsCreateOpen(false);
    } catch (error) {
      handleApiError(error, t("sales.messages.createError"));
    }
  };

  const handleCreateAndApproveInvoice = async (payload: CreateInvoiceRequest) => {
    try {
      await createAndApproveInvoiceMutation.mutateAsync(payload);
      resetFiltersToDefault();
      await queryClient.invalidateQueries({
        queryKey: invoicesKeys.lists(),
        refetchType: "active",
      });
      showSuccess(t("sales.messages.createAndApproveSuccess"));
      setIsCreateOpen(false);
    } catch (error) {
      handleApiError(error, t("sales.messages.createAndApproveError"));
    }
  };

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!window.confirm(t("sales.messages.deleteConfirm", { invoiceNumber }))) {
      return;
    }

    try {
      await deleteInvoiceMutation.mutateAsync(invoiceId);
      await queryClient.invalidateQueries({
        queryKey: invoicesKeys.lists(),
        refetchType: "active",
      });
      showSuccess(t("sales.messages.deleteSuccess"));
    } catch (error) {
      handleApiError(error, t("sales.messages.deleteError"));
    }
  };

  const handleDuplicateInvoice = async (invoiceId: string) => {
    try {
      const invoice = await invoicesApi.getById(invoiceId);
      setInitialInvoiceDraft({
        issueDate: new Date().toISOString().split("T")[0],
        partyAddress: invoice.partyAddress || undefined,
        taxAmount: Number(invoice.taxAmount || 0),
        notes: invoice.notes || undefined,
        items: invoice.items.map((item) => ({
          productId: item.productId || undefined,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      setIsCreateOpen(true);
    } catch (error) {
      handleApiError(error, t("sales.messages.duplicateError"));
    }
  };

  if (!canView) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("sales.title")}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("sales.noPermission")}</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("sales.title")}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("sales.subtitle")}</p>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t("sales.statusNotice")}</p>
          </div>

          {canCreate && (
            <Button
              startIcon={<Plus size={16} />}
              onClick={() => {
                setInitialInvoiceDraft(null);
                setIsCreateOpen(true);
              }}
            >
              {t("sales.actions.addInvoice")}
            </Button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <input
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-border-focus focus:outline-none focus:ring-3 focus:ring-primary/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              placeholder={t("sales.filters.search")}
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="md:col-span-3">
            <Combobox
              value={String(limit)}
              options={limitOptions}
              searchable={false}
              placeholder={String(limit)}
              searchPlaceholder={t("sales.filters.search")}
              onChange={(value) => {
                setLimit(Number(value ?? 10));
                setPage(1);
              }}
            />
          </div>
        </div>
      </section>

      <QueryState
        isLoading={invoicesQuery.isLoading}
        isError={invoicesQuery.isError}
        errorMessage={invoicesQuery.error?.message}
        isEmpty={!invoicesQuery.isLoading && invoices.length === 0}
        emptyTitle={t("sales.empty.title")}
        emptyDescription={t("sales.empty.description")}
        emptyAction={
          canCreate
            ? {
                label: t("sales.actions.addInvoice"),
                onClick: () => setIsCreateOpen(true),
              }
            : undefined
        }
      >
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800">
                  <th className="px-3 py-3">{t("sales.table.invoiceNumber")}</th>
                  <th className="px-3 py-3">{t("sales.table.issueDate")}</th>
                  <th className="px-3 py-3">{t("sales.table.status")}</th>
                  <th className="px-3 py-3">{t("sales.table.total")}</th>
                  <th className="px-3 py-3">{t("sales.table.tax")}</th>
                  <th className="px-3 py-3">{t("sales.table.createdBy")}</th>
                  {(canCreate || canDelete) && <th className="px-3 py-3">{t("sales.table.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 last:border-b-0 dark:border-gray-800/70">
                    <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                      {dateFormatter.format(new Date(invoice.issueDate))}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          invoice.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        }`}
                      >
                        {tInvoiceStatus(invoice.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                      {formatMoney(invoice.totalAmount, locale)}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                      {formatMoney(invoice.taxAmount, locale)}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                      {invoice.createdBy?.fullName || "-"}
                    </td>
                    {(canCreate || canDelete) && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {canCreate && (
                            <button
                              className="rounded-md p-1.5 text-blue-light-500 transition hover:bg-blue-light-50 hover:text-blue-light-600 dark:hover:bg-blue-light-500/10"
                              onClick={() => void handleDuplicateInvoice(invoice.id)}
                              title={t("sales.actions.duplicate")}
                            >
                              <Copy size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
                              onClick={() => void handleDeleteInvoice(invoice.id, invoice.invoiceNumber)}
                              disabled={deleteInvoiceMutation.isPending}
                              title={t("actions.delete")}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm dark:border-gray-800">
            <span className="text-gray-600 dark:text-gray-400">
              {t("sales.pagination.summary", {
                page: meta.page,
                totalPages: Math.max(meta.totalPages, 1),
                total: meta.total,
              })}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={!meta.hasPrev}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                {t("sales.pagination.previous")}
              </Button>
              <Button
                variant="outline"
                disabled={!meta.hasNext}
                onClick={() => setPage((prev) => prev + 1)}
              >
                {t("sales.pagination.next")}
              </Button>
            </div>
          </div>
        </section>
      </QueryState>

      <CustomerInvoiceCreateModal
        open={isCreateOpen}
        loading={createInvoiceMutation.isPending || createAndApproveInvoiceMutation.isPending}
        canApproveDirect={canApproveDirect}
        customerId={customerId}
        customerAddress={customerAddress}
        initialPayload={initialInvoiceDraft}
        onClose={() => {
          setIsCreateOpen(false);
          setInitialInvoiceDraft(null);
        }}
        onSubmitDraft={handleCreateInvoice}
        onSubmitAndApprove={canApproveDirect ? handleCreateAndApproveInvoice : undefined}
      />
    </div>
  );
}

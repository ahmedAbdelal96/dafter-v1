"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ComboboxOption } from "@/components/ui/combobox/Combobox";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { API_LIMITS } from "@/lib/api/config";
import { useCustomers } from "@/lib/api/hooks/use-customers";
import { useSuppliers } from "@/lib/api/hooks/use-suppliers";
import {
  useCreateAndApproveInvoice,
  useCreateInvoice,
  useDeleteInvoice,
  useInvoices,
} from "@/lib/api/hooks/use-invoices";
import { invoicesApi } from "@/lib/api/services";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import type {
  CreateInvoiceRequest,
  InvoiceStatus,
  InvoiceSummaryItem,
  InvoicesFilters,
  PartyType,
} from "@/lib/api/types";
import { InvoiceCreateModal } from "./InvoiceCreateModal";
import { InvoicesTable } from "./InvoicesTable";
import { InvoicesToolbar } from "./InvoicesToolbar";
import { DEFAULT_INVOICES_META, type InvoicePartyFilter } from "../utils/invoice-schemas";
import { formatMoney } from "../utils/invoice-format";

export function InvoicesPageClient() {
  const t = useTranslations("invoices");
  const locale = useLocale();
  const router = useRouter();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();
  const { hasPermission, hasRole } = usePermission();

  const canCreate = hasPermission("invoices:create");
  const canApproveDirect = hasPermission("approveInvoice");
  const canDelete = hasPermission("invoices:delete") && hasRole("OWNER");

  const [searchInput, setSearchInput] = useState("");
  const [partySearchInput, setPartySearchInput] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState<InvoicePartyFilter>("all");
  const [partyIdFilter, setPartyIdFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialCreatePayload, setInitialCreatePayload] = useState<CreateInvoiceRequest | null>(
    null
  );
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const filters: InvoicesFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      partyType: partyTypeFilter === "all" ? undefined : (partyTypeFilter as PartyType),
      partyId: partyIdFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy: "issueDate",
      sortOrder: "desc",
    }),
    [page, limit, debouncedSearch, partyTypeFilter, partyIdFilter, statusFilter, dateFrom, dateTo]
  );

  const customerSearch = useDebouncedValue(partyTypeFilter === "CUSTOMER" ? partySearchInput : "", 350);
  const supplierSearch = useDebouncedValue(partyTypeFilter === "SUPPLIER" ? partySearchInput : "", 350);

  const customersQuery = useCustomers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: partyTypeFilter === "CUSTOMER" ? customerSearch || undefined : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });
  const suppliersQuery = useSuppliers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: partyTypeFilter === "SUPPLIER" ? supplierSearch || undefined : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const invoicesQuery = useInvoices(filters, hasPermission("invoices:view"));
  const createInvoiceMutation = useCreateInvoice();
  const createAndApproveInvoiceMutation = useCreateAndApproveInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();

  const invoices = invoicesQuery.data?.items ?? [];
  const meta = invoicesQuery.data?.meta ?? DEFAULT_INVOICES_META;

  const partyOptions = useMemo<ComboboxOption[]>(() => {
    if (partyTypeFilter === "SUPPLIER") {
      return (suppliersQuery.data?.items ?? []).map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      }));
    }

    if (partyTypeFilter === "CUSTOMER") {
      return (customersQuery.data?.items ?? []).map((customer) => ({
        value: customer.id,
        label: customer.name,
      }));
    }

    return [
      ...(customersQuery.data?.items ?? []).map((customer) => ({
        value: customer.id,
        label: `${customer.name} (${t("filters.partyTypeCustomer")})`,
      })),
      ...(suppliersQuery.data?.items ?? []).map((supplier) => ({
        value: supplier.id,
        label: `${supplier.name} (${t("filters.partyTypeSupplier")})`,
      })),
    ];
  }, [customersQuery.data?.items, partyTypeFilter, suppliersQuery.data?.items, t]);

  const handleCreate = async (payload: CreateInvoiceRequest) => {
    try {
      await createInvoiceMutation.mutateAsync(payload);
      showSuccess(t("messages.createDraftSuccess"));
      setIsCreateOpen(false);
      setSearchInput("");
      setPartySearchInput("");
      setPartyTypeFilter("all");
      setPartyIdFilter(undefined);
      setStatusFilter("all");
      setDateFrom("");
      setDateTo("");
      setPage(1);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleCreateAndApprove = async (payload: CreateInvoiceRequest) => {
    try {
      await createAndApproveInvoiceMutation.mutateAsync(payload);
      showSuccess(t("messages.createAndApproveSuccess"));
      setIsCreateOpen(false);
      setSearchInput("");
      setPartySearchInput("");
      setPartyTypeFilter("all");
      setPartyIdFilter(undefined);
      setStatusFilter("all");
      setDateFrom("");
      setDateTo("");
      setPage(1);
    } catch (error) {
      handleApiError(error, t("messages.createAndApproveError"));
    }
  };

  const handleDuplicate = async (invoiceId: string) => {
    try {
      const invoice = await invoicesApi.getById(invoiceId);
      setInitialCreatePayload({
        partyType: invoice.partyType === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER",
        partyId: invoice.partyId,
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
      handleApiError(error, t("messages.duplicateError"));
    }
  };

  const handleDelete = async (invoice: InvoiceSummaryItem) => {
    if (!window.confirm(t("messages.deleteConfirm", { invoiceNumber: invoice.invoiceNumber }))) {
      return;
    }

    try {
      await deleteInvoiceMutation.mutateAsync(invoice.id);
      showSuccess(t("messages.deleteSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.deleteError"));
    }
  };

  const handleView = useCallback(
    (id: string) => {
      router.push(`/${locale}/invoices/${id}`);
    },
    [locale, router]
  );

  const handleExportExcel = async (scope?: ExportScope) => {
    try {
      setIsExporting(true);
      const exportFilters: InvoicesFilters = {
        ...filters,
        dateFrom: scope?.dateFrom ?? filters.dateFrom,
        dateTo: scope?.dateTo ?? filters.dateTo,
      };
      const allItems: InvoiceSummaryItem[] = await fetchAllMetaItems((currentPage, pageSize) =>
        invoicesApi.getAll({
          ...exportFilters,
          page: currentPage,
          limit: pageSize,
        }),
        { maxItems: scope?.maxRecords }
      );

      if (allItems.length === 0) {
        showInfo(t("messages.exportEmpty"));
        return;
      }

      const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });

      const rows = allItems.map((invoice) => ({
        [t("table.invoiceNumber")]: invoice.invoiceNumber,
        [t("table.issueDate")]: dateFormatter.format(new Date(invoice.issueDate)),
        [t("table.partyType")]:
          invoice.partyType === "CUSTOMER"
            ? t("filters.partyTypeCustomer")
            : t("filters.partyTypeSupplier"),
        [t("table.partyName")]: invoice.partyName,
        [t("table.totalAmount")]: formatMoney(invoice.totalAmount, locale),
        [t("table.taxAmount")]: formatMoney(invoice.taxAmount, locale),
        [t("table.createdBy")]: invoice.createdBy?.fullName || "-",
      }));

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [18, 18, 14, 28, 18, 14, 22],
      });
      showSuccess(t("messages.exportSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <InvoicesToolbar
        searchInput={searchInput}
        partyTypeFilter={partyTypeFilter}
        partyIdFilter={partyIdFilter}
        statusFilter={statusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        limit={limit}
        total={meta.total}
        partyOptions={partyOptions}
        canCreate={canCreate}
        isExporting={isExporting}
        onSearchChange={(value) => {
          setSearchInput(value);
          setPage(1);
        }}
        onPartyTypeChange={(value) => {
          setPartyTypeFilter(value);
          setPartyIdFilter(undefined);
          setPartySearchInput("");
          setPage(1);
        }}
        onPartyIdChange={(value) => {
          setPartyIdFilter(value);
          setPage(1);
        }}
        onPartySearchChange={setPartySearchInput}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(1);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(1);
        }}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        onCreateClick={() => {
          setInitialCreatePayload(null);
          setIsCreateOpen(true);
        }}
        onExportClick={() => setIsExportScopeOpen(true)}
      />

      <QueryState
        isLoading={invoicesQuery.isLoading}
        isError={invoicesQuery.isError}
        errorMessage={invoicesQuery.error?.message}
        isEmpty={!invoicesQuery.isLoading && !invoicesQuery.isFetching && invoices.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={
          canCreate
            ? {
                label: t("actions.addInvoice"),
                onClick: () => setIsCreateOpen(true),
              }
            : undefined
        }
      >
        <InvoicesTable
          invoices={invoices}
          meta={meta}
          canDelete={canDelete}
          deleting={deleteInvoiceMutation.isPending}
          onPageChange={setPage}
          onView={handleView}
          onDuplicate={(id) => void handleDuplicate(id)}
          onDelete={handleDelete}
        />
      </QueryState>

      <InvoiceCreateModal
        open={isCreateOpen}
        loading={createInvoiceMutation.isPending || createAndApproveInvoiceMutation.isPending}
        canApproveDirect={canApproveDirect}
        initialPayload={initialCreatePayload}
        onClose={() => {
          setIsCreateOpen(false);
          setInitialCreatePayload(null);
        }}
        onSubmitDraft={handleCreate}
        onSubmitAndApprove={canApproveDirect ? handleCreateAndApprove : undefined}
      />

      <ExportScopeModal
        open={isExportScopeOpen}
        loading={isExporting}
        initialScope={{
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        }}
        labels={{
          title: t("exportModal.title"),
          description: `${t("exportModal.description")} (${meta.total})`,
          fromDate: t("exportModal.fromDate"),
          toDate: t("exportModal.toDate"),
          maxRecords: t("exportModal.maxRecords"),
          maxRecordsHint: t("exportModal.maxRecordsHint"),
          reset: t("exportModal.reset"),
          cancel: t("actions.cancel"),
          confirm: t("actions.export"),
        }}
        onClose={() => setIsExportScopeOpen(false)}
        onConfirm={(scope) => {
          setIsExportScopeOpen(false);
          void handleExportExcel(scope);
        }}
      />
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ComboboxOption } from "@/components/ui/combobox/Combobox";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { API_LIMITS } from "@/lib/api/config";
import { useCustomers } from "@/lib/api/hooks/use-customers";
import { useEmployees } from "@/lib/api/hooks/use-employees";
import { useSuppliers } from "@/lib/api/hooks/use-suppliers";
import {
  useCancelDeferredSale,
  useCreateDeferredSale,
  useDeferredSales,
  useRecordDeferredPayment,
} from "@/lib/api/hooks/use-deferred-sales";
import { deferredSalesApi } from "@/lib/api/services";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import type {
  DeferredSaleRecord,
  DeferredSalesFilters,
  DeferredSaleStatus,
  PartyType,
} from "@/lib/api/types";
import { DeferredSaleCreateModal } from "./DeferredSaleCreateModal";
import { DeferredSalePaymentModal } from "./DeferredSalePaymentModal";
import { DeferredSalesTable } from "./DeferredSalesTable";
import { DeferredSalesToolbar } from "./DeferredSalesToolbar";
import { DEFAULT_DEFERRED_SALES_META, type DeferredSalesStatusFilter } from "../utils/deferred-sales-schemas";
import { formatMoney } from "../utils/deferred-sales-format";

export function DeferredSalesPageClient() {
  const t = useTranslations("deferred-sales");
  const locale = useLocale();
  const router = useRouter();
  const { hasPermission, hasRole } = usePermission();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();

  const canCreate = hasPermission("deferredSales:create");
  const canManage = hasPermission("deferredSales:update");
  const canCancel = hasRole("OWNER");
  const canExport = hasPermission("deferredSales:view");

  const [searchInput, setSearchInput] = useState("");
  const [partySearchInput, setPartySearchInput] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState<"all" | PartyType>("all");
  const [partyIdFilter, setPartyIdFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<DeferredSalesStatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<DeferredSaleRecord | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const partyLookupSearch = useDebouncedValue(partySearchInput, 350);

  const filters: DeferredSalesFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      partyType: partyTypeFilter === "all" ? undefined : partyTypeFilter,
      partyId: partyIdFilter,
      status: statusFilter === "all" ? undefined : (statusFilter as DeferredSaleStatus),
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, limit, debouncedSearch, partyTypeFilter, partyIdFilter, statusFilter, dateFrom, dateTo],
  );

  const customersQuery = useCustomers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: partyTypeFilter === "CUSTOMER" ? partyLookupSearch || undefined : undefined,
  });

  const suppliersQuery = useSuppliers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: partyTypeFilter === "SUPPLIER" ? partyLookupSearch || undefined : undefined,
  });

  const employeesQuery = useEmployees({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: partyTypeFilter === "EMPLOYEE" ? partyLookupSearch || undefined : undefined,
  });

  const listQuery = useDeferredSales(filters, hasPermission("deferredSales:view"));
  const createMutation = useCreateDeferredSale();
  const paymentMutation = useRecordDeferredPayment();
  const cancelMutation = useCancelDeferredSale();

  const items = listQuery.data?.items ?? [];
  const meta = listQuery.data?.meta ?? DEFAULT_DEFERRED_SALES_META;

  const partyOptions = useMemo<ComboboxOption[]>(() => {
    const customers = (customersQuery.data?.items ?? []).map((customer) => ({
      value: customer.id,
      label: `${customer.name} (${t("filters.partyTypeCustomer")})`,
    }));

    const suppliers = (suppliersQuery.data?.items ?? []).map((supplier) => ({
      value: supplier.id,
      label: `${supplier.name} (${t("filters.partyTypeSupplier")})`,
    }));

    const employees = (employeesQuery.data?.items ?? []).map((employee) => ({
      value: employee.id,
      label: `${employee.name} (${t("filters.partyTypeEmployee")})`,
    }));

    if (partyTypeFilter === "CUSTOMER") return customers;
    if (partyTypeFilter === "SUPPLIER") return suppliers;
    if (partyTypeFilter === "EMPLOYEE") return employees;

    return [...customers, ...suppliers, ...employees];
  }, [customersQuery.data?.items, employeesQuery.data?.items, partyTypeFilter, suppliersQuery.data?.items, t]);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/${locale}/deferred-sales/${id}`);
    },
    [locale, router],
  );

  const handleCreate = async (payload: Parameters<typeof createMutation.mutateAsync>[0]) => {
    try {
      await createMutation.mutateAsync(payload);
      showSuccess(t("messages.createSuccess"));
      setIsCreateOpen(false);
      // Reset active filters after creation so the new record is visible immediately.
      setSearchInput("");
      setPartySearchInput("");
      setPartyTypeFilter("all");
      setPartyIdFilter(undefined);
      setStatusFilter("all");
      setDateFrom("");
      setDateTo("");
      setPage(1);
      setLimit(10);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleRecordPayment = async (payload: { amount: number; paymentDate: string; paymentMethod?: string; notes?: string }) => {
    if (!paymentTarget) return;

    try {
      await paymentMutation.mutateAsync({ id: paymentTarget.id, payload });
      showSuccess(t("messages.paymentSuccess"));
      setPaymentTarget(null);
    } catch (error) {
      handleApiError(error, t("messages.paymentError"));
    }
  };

  const handleCancel = async (sale: DeferredSaleRecord) => {
    if (!window.confirm(t("messages.cancelConfirm", { referenceNumber: sale.referenceNumber }))) {
      return;
    }

    try {
      await cancelMutation.mutateAsync(sale.id);
      showSuccess(t("messages.cancelSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.cancelError"));
    }
  };

  const handleExportExcel = async (scope?: ExportScope) => {
    try {
      setIsExporting(true);
      const exportFilters: DeferredSalesFilters = {
        ...filters,
        dateFrom: scope?.dateFrom ?? filters.dateFrom,
        dateTo: scope?.dateTo ?? filters.dateTo,
      };

      const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
        deferredSalesApi.getAll({
          ...exportFilters,
          page: currentPage,
          limit: pageSize,
        }), { maxItems: scope?.maxRecords },
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

      const partyLabelById = new Map(partyOptions.map((option) => [option.value, option.label]));
      const rows = allItems.map((sale) => ({
        [t("table.referenceNumber")]: sale.referenceNumber,
        [t("table.partyType")]: t(`partyType.${sale.partyType}`),
        [t("table.partyName")]: partyLabelById.get(sale.partyId) ?? sale.partyId,
        [t("table.totalAmount")]: formatMoney(sale.totalAmount, locale),
        [t("table.paidAmount")]: formatMoney(sale.paidAmount, locale),
        [t("table.remaining")]: formatMoney(sale.remaining, locale),
        [t("table.dueDate")]: dateFormatter.format(new Date(sale.dueDate)),
        [t("table.status")]: t(`status.${sale.status}`),
      }));

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [18, 16, 28, 18, 18, 18, 16, 16],
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
      <DeferredSalesToolbar
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
        canExport={canExport}
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
        onCreateClick={() => setIsCreateOpen(true)}
        onExportClick={() => setIsExportScopeOpen(true)}
      />

      <QueryState
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        errorMessage={listQuery.error?.message}
        isEmpty={!listQuery.isLoading && !listQuery.isFetching && items.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={
          canCreate
            ? {
                label: t("actions.add"),
                onClick: () => setIsCreateOpen(true),
              }
            : undefined
        }
      >
        <DeferredSalesTable
          items={items}
          meta={meta}
          canManage={canManage}
          canCancel={canCancel}
          mutating={paymentMutation.isPending || cancelMutation.isPending}
          onPageChange={setPage}
          onView={handleView}
          onRecordPayment={setPaymentTarget}
          onCancel={(sale) => void handleCancel(sale)}
        />
      </QueryState>

      <DeferredSaleCreateModal
        open={isCreateOpen}
        loading={createMutation.isPending}
        partyOptions={partyOptions}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <DeferredSalePaymentModal
        open={Boolean(paymentTarget)}
        loading={paymentMutation.isPending}
        sale={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSubmit={handleRecordPayment}
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

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
import { installmentsApi } from "@/lib/api/services";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import { useCustomers } from "@/lib/api/hooks/use-customers";
import { useEmployees } from "@/lib/api/hooks/use-employees";
import { useSuppliers } from "@/lib/api/hooks/use-suppliers";
import {
  useCancelInstallmentContract,
  useCreateInstallmentContract,
  useInstallmentContracts,
  useInstallmentsSchedule,
} from "@/lib/api/hooks/use-installments";
import type {
  CreateInstallmentContractRequest,
  InstallmentsFilters,
  InstallmentsScheduleFilters,
  PartyType,
} from "@/lib/api/types";
import { InstallmentCreateModal } from "./InstallmentCreateModal";
import { InstallmentsTable } from "./InstallmentsTable";
import { InstallmentsToolbar } from "./InstallmentsToolbar";
import { InstallmentScheduleSection } from "./InstallmentScheduleSection";
import {
  DEFAULT_INSTALLMENTS_META,
  DEFAULT_INSTALLMENTS_SCHEDULE_META,
  type InstallmentContractStatusFilter,
  type InstallmentPartyFilter,
  type InstallmentScheduleStatusFilter,
} from "../utils/installments-schemas";

function getMonthDateRange() {
  const now = new Date();
  const first = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const last = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
  return {
    from: first.toISOString().split("T")[0],
    to: last.toISOString().split("T")[0],
  };
}

export function InstallmentsPageClient() {
  const t = useTranslations("installments");
  const locale = useLocale();
  const router = useRouter();
  const { hasPermission, hasRole } = usePermission();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();

  const canCreate = hasPermission("installments:create");
  const canUpdate = hasPermission("installments:update");
  const canCancel = hasRole("OWNER");

  const [searchInput, setSearchInput] = useState("");
  const [partySearchInput, setPartySearchInput] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState<InstallmentPartyFilter>("all");
  const [partyIdFilter, setPartyIdFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<InstallmentContractStatusFilter>("all");
  const [scheduleStatusFilter, setScheduleStatusFilter] =
    useState<InstallmentScheduleStatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);

  const [schedulePage, setSchedulePage] = useState(1);
  const [scheduleLimit, setScheduleLimit] = useState(10);
  const defaultScheduleRange = useMemo(() => getMonthDateRange(), []);

  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const partyLookupSearch = useDebouncedValue(partySearchInput, 350);

  const filters: InstallmentsFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      partyType: partyTypeFilter === "all" ? undefined : (partyTypeFilter as PartyType),
      partyId: partyIdFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      scheduleStatus: scheduleStatusFilter === "all" ? undefined : scheduleStatusFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [
      page,
      limit,
      debouncedSearch,
      partyTypeFilter,
      partyIdFilter,
      statusFilter,
      scheduleStatusFilter,
      dateFrom,
      dateTo,
    ],
  );

  const scheduleFilters: InstallmentsScheduleFilters = useMemo(
    () => ({
      page: schedulePage,
      limit: scheduleLimit,
      dateFrom: dateFrom || defaultScheduleRange.from,
      dateTo: dateTo || defaultScheduleRange.to,
      status:
        scheduleStatusFilter === "all"
          ? ["PENDING", "PARTIAL", "OVERDUE"]
          : [scheduleStatusFilter],
    }),
    [dateFrom, dateTo, defaultScheduleRange.from, defaultScheduleRange.to, scheduleLimit, schedulePage, scheduleStatusFilter],
  );

  const customersQuery = useCustomers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: partyTypeFilter === "CUSTOMER" ? partyLookupSearch || undefined : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const suppliersQuery = useSuppliers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: partyTypeFilter === "SUPPLIER" ? partyLookupSearch || undefined : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const employeesQuery = useEmployees({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    isActive: true,
    search: partyTypeFilter === "EMPLOYEE" ? partyLookupSearch || undefined : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const contractsQuery = useInstallmentContracts(filters, hasPermission("installments:view"));
  const scheduleQuery = useInstallmentsSchedule(scheduleFilters, hasPermission("installments:view"));
  const createMutation = useCreateInstallmentContract();
  const cancelMutation = useCancelInstallmentContract();

  const contracts = contractsQuery.data?.items ?? [];
  const contractsMeta = contractsQuery.data?.meta ?? DEFAULT_INSTALLMENTS_META;
  const scheduleItems = scheduleQuery.data?.items ?? [];
  const scheduleMeta = scheduleQuery.data?.meta ?? DEFAULT_INSTALLMENTS_SCHEDULE_META;

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
  }, [
    customersQuery.data?.items,
    employeesQuery.data?.items,
    partyTypeFilter,
    suppliersQuery.data?.items,
    t,
  ]);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/${locale}/installments/${id}`);
    },
    [locale, router],
  );

  const handleCreate = async (payload: CreateInstallmentContractRequest) => {
    try {
      await createMutation.mutateAsync(payload);
      showSuccess(t("messages.createSuccess"));
      setIsCreateOpen(false);
      setSearchInput("");
      setPartySearchInput("");
      setPartyTypeFilter("all");
      setPartyIdFilter(undefined);
      setStatusFilter("all");
      setScheduleStatusFilter("all");
      setDateFrom("");
      setDateTo("");
      setPage(1);
      setSchedulePage(1);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleCancel = async (contractId: string, contractNumber: string) => {
    if (!window.confirm(t("messages.cancelConfirm", { contractNumber }))) {
      return;
    }

    try {
      await cancelMutation.mutateAsync(contractId);
      showSuccess(t("messages.cancelSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.cancelError"));
    }
  };

  const handleExportExcel = async (scope?: ExportScope) => {
    try {
      setIsExporting(true);
      const exportFilters: InstallmentsFilters = {
        ...filters,
        dateFrom: scope?.dateFrom ?? filters.dateFrom,
        dateTo: scope?.dateTo ?? filters.dateTo,
      };
      const allItems = await fetchAllMetaItems((currentPage, pageSize) =>
        installmentsApi.getContracts({
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

      const rows = allItems.map((item) => ({
        [t("table.contractNumber")]: item.contractNumber,
        [t("table.partyType")]: t(`partyType.${item.partyType}`),
        [t("table.totalAmount")]: Number(item.totalAmount),
        [t("table.paidAmount")]: Number(item.paidAmount),
        [t("details.remaining")]: Number(item.totalAmount) - Number(item.paidAmount),
        [t("table.installmentsCount")]: item.numberOfInstallments,
        [t("table.startDate")]: new Date(item.startDate).toLocaleDateString(
          locale === "ar" ? "ar-EG" : "en-US",
        ),
        [t("table.status")]: t(`status.${item.status}`),
      }));

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [22, 16, 16, 16, 16, 14, 16, 14],
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
      <InstallmentsToolbar
        searchInput={searchInput}
        partyTypeFilter={partyTypeFilter}
        partyIdFilter={partyIdFilter}
        statusFilter={statusFilter}
        scheduleStatusFilter={scheduleStatusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        limit={limit}
        total={contractsMeta.total}
        isExporting={isExporting}
        partyOptions={partyOptions}
        canCreate={canCreate}
        canExport={hasPermission("installments:view")}
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
        onScheduleStatusChange={(value) => {
          setScheduleStatusFilter(value);
          setPage(1);
          setSchedulePage(1);
        }}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(1);
          setSchedulePage(1);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(1);
          setSchedulePage(1);
        }}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        onCreateClick={() => setIsCreateOpen(true)}
        onExportClick={() => setIsExportScopeOpen(true)}
      />

      <QueryState
        isLoading={contractsQuery.isLoading}
        isError={contractsQuery.isError}
        errorMessage={contractsQuery.error?.message}
        isEmpty={!contractsQuery.isLoading && !contractsQuery.isFetching && contracts.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={
          canCreate
            ? {
                label: t("actions.addContract"),
                onClick: () => setIsCreateOpen(true),
              }
            : undefined
        }
      >
        <InstallmentsTable
          contracts={contracts}
          meta={contractsMeta}
          canCancel={canCancel && canUpdate}
          mutating={cancelMutation.isPending}
          onPageChange={setPage}
          onView={handleView}
          onCancel={(contract) => void handleCancel(contract.id, contract.contractNumber)}
        />
      </QueryState>

      <InstallmentScheduleSection
        items={scheduleItems}
        meta={scheduleMeta}
        loading={scheduleQuery.isLoading || scheduleQuery.isFetching}
        onPageChange={setSchedulePage}
      />

      <InstallmentCreateModal
        open={isCreateOpen}
        loading={createMutation.isPending}
        partyOptions={partyOptions}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
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
          description: `${t("exportModal.description")} (${contractsMeta.total})`,
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

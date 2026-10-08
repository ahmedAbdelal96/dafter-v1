"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { customersApi } from "@/lib/api/services";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import {
  useCustomer,
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "@/lib/api/hooks/use-customers";
import type {
  CreateCustomerRequest,
  Customer,
  CustomerFilters,
  UpdateCustomerRequest,
} from "@/lib/api/types";
import { CustomerCreateModal } from "./CustomerCreateModal";
import { CustomerEditModal } from "./CustomerEditModal";
import { CustomersTable } from "./CustomersTable";
import { CustomersToolbar } from "./CustomersToolbar";
import {
  DEFAULT_CUSTOMERS_META,
  type CreateCustomerFormValues,
  type StatusFilter,
  type UpdateCustomerFormValues,
} from "../utils/customer-schemas";
import { toOptionalNumber, toOptionalNumberOrNull } from "../utils/customer-format";
import { buildCustomerExportRows } from "../utils/customer-export";

export function CustomersPageClient() {
  const t = useTranslations("customers");
  const locale = useLocale();
  const router = useRouter();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();
  const { hasPermission } = usePermission();

  const canCreate = hasPermission("customers:create");
  const canUpdate = hasPermission("customers:update");
  const canDelete = hasPermission("customers:delete");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);

  const filters: CustomerFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, limit, debouncedSearch, statusFilter]
  );

  const customersQuery = useCustomers(filters);
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

  const editCustomerQuery = useCustomer(editCustomerId ?? "", Boolean(editCustomerId));

  const customers = customersQuery.data?.items ?? [];
  const meta = customersQuery.data?.meta ?? DEFAULT_CUSTOMERS_META;

  const handleCreate = async (values: CreateCustomerFormValues) => {
    const payload: CreateCustomerRequest = {
      name: values.name.trim(),
      phone: values.phone?.trim() || undefined,
      address: values.address?.trim() || undefined,
      openingBalance: toOptionalNumber(values.openingBalance) ?? 0,
      creditLimit: toOptionalNumber(values.creditLimit),
    };

    try {
      await createCustomerMutation.mutateAsync(payload);
      showSuccess(t("messages.createSuccess"));
      setIsCreateOpen(false);
      setSearchInput("");
      setStatusFilter("all");
      setPage(1);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleUpdate = async (values: UpdateCustomerFormValues) => {
    if (!editCustomerQuery.data) return;

    const payload: UpdateCustomerRequest = {
      name: values.name.trim(),
      phone: values.phone?.trim() || null,
      address: values.address?.trim() || null,
      creditLimit: toOptionalNumberOrNull(values.creditLimit),
      isActive: values.isActive,
      version: editCustomerQuery.data.version,
    };

    try {
      await updateCustomerMutation.mutateAsync({
        id: editCustomerQuery.data.id,
        payload,
      });
      showSuccess(t("messages.updateSuccess"));
      setEditCustomerId(null);
    } catch (error) {
      handleApiError(error, t("messages.updateError"));
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(t("delete.confirm", { name: customer.name }))) {
      return;
    }

    try {
      await deleteCustomerMutation.mutateAsync(customer.id);
      showSuccess(t("messages.deleteSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.deleteError"));
    }
  };

  const handleView = useCallback(
    (id: string) => {
      router.push(`/${locale}/customers/${id}`);
    },
    [locale, router]
  );

  const handleExportExcel = async (scope?: ExportScope) => {
    try {
      setIsExporting(true);
      const allItems = await fetchAllMetaItems(
        (currentPage, pageSize) =>
          customersApi.getAll({
            ...filters,
            page: currentPage,
            limit: pageSize,
          }),
        { maxItems: scope?.maxRecords }
      );

      if (allItems.length === 0) {
        showInfo(t("messages.exportEmpty"));
        return;
      }

      const rows = buildCustomerExportRows(allItems, locale, t);

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [26, 18, 32, 18, 18, 14],
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
      <CustomersToolbar
        searchInput={searchInput}
        statusFilter={statusFilter}
        limit={limit}
        total={meta.total}
        canCreate={canCreate}
        canExport={hasPermission("customers:view")}
        isExporting={isExporting}
        onSearchChange={(value) => {
          setSearchInput(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatusFilter(value);
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
        isLoading={customersQuery.isLoading}
        isError={customersQuery.isError}
        errorMessage={customersQuery.error?.message}
        isEmpty={!customersQuery.isLoading && !customersQuery.isFetching && customers.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={
          canCreate
            ? {
                label: t("actions.addCustomer"),
                onClick: () => setIsCreateOpen(true),
              }
            : undefined
        }
      >
        <CustomersTable
          customers={customers}
          meta={meta}
          canUpdate={canUpdate}
          canDelete={canDelete}
          deleting={deleteCustomerMutation.isPending}
          onPageChange={setPage}
          onView={handleView}
          onEdit={setEditCustomerId}
          onDelete={handleDelete}
        />
      </QueryState>

      <CustomerCreateModal
        open={isCreateOpen}
        loading={createCustomerMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <CustomerEditModal
        open={Boolean(editCustomerId)}
        customer={editCustomerQuery.data ?? null}
        loading={editCustomerQuery.isLoading || updateCustomerMutation.isPending}
        onClose={() => setEditCustomerId(null)}
        onSubmit={handleUpdate}
      />

      <ExportScopeModal
        open={isExportScopeOpen}
        loading={isExporting}
        showDateRange={false}
        labels={{
          title: t("exportModal.title"),
          description: `${t("exportModal.description")} (${meta.total})`,
          maxRecords: t("exportModal.maxRecords"),
          maxRecordsHint: t("exportModal.maxRecordsHint"),
          reset: t("exportModal.reset"),
          cancel: t("actions.cancel"),
          confirm: t("actions.exportExcel"),
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

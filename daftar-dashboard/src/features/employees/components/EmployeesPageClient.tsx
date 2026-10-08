"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { employeesApi } from "@/lib/api/services";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import {
  useEmployee,
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "@/lib/api/hooks/use-employees";
import type {
  CreateEmployeeRequest,
  Employee,
  EmployeeFilters,
  UpdateEmployeeRequest,
} from "@/lib/api/types";
import { EmployeeCreateModal } from "./EmployeeCreateModal";
import { EmployeeEditModal } from "./EmployeeEditModal";
import { EmployeesTable } from "./EmployeesTable";
import { EmployeesToolbar } from "./EmployeesToolbar";
import {
  DEFAULT_EMPLOYEES_META,
  type CreateEmployeeFormValues,
  type StatusFilter,
  type UpdateEmployeeFormValues,
} from "../utils/employee-schemas";
import { formatMoney, toOptionalNumber } from "../utils/employee-format";

export function EmployeesPageClient() {
  const t = useTranslations("employees");
  const locale = useLocale();
  const router = useRouter();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();
  const { hasPermission, hasRole } = usePermission();

  const canCreate = hasPermission("employees:create");
  const canUpdate = hasPermission("employees:update");
  const canDelete = hasPermission("employees:delete") && hasRole("OWNER");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);

  const filters: EmployeeFilters = useMemo(
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

  const employeesQuery = useEmployees(filters as EmployeeFilters);
  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();
  const deleteEmployeeMutation = useDeleteEmployee();

  const editEmployeeQuery = useEmployee(editEmployeeId ?? "", Boolean(editEmployeeId));

  const employees = employeesQuery.data?.items ?? [];
  const meta = employeesQuery.data?.meta ?? DEFAULT_EMPLOYEES_META;

  const handleCreate = async (values: CreateEmployeeFormValues) => {
    const payload: CreateEmployeeRequest = {
      name: values.name.trim(),
      phone: values.phone?.trim() || undefined,
      jobTitle: values.jobTitle?.trim() || undefined,
      openingBalance: toOptionalNumber(values.openingBalance) ?? 0,
    };

    try {
      await createEmployeeMutation.mutateAsync(payload);
      showSuccess(t("messages.createSuccess"));
      setIsCreateOpen(false);
      setSearchInput("");
      setStatusFilter("all");
      setPage(1);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleUpdate = async (values: UpdateEmployeeFormValues) => {
    if (!editEmployeeQuery.data) return;

    const payload: UpdateEmployeeRequest = {
      name: values.name.trim(),
      phone: values.phone?.trim() || "",
      jobTitle: values.jobTitle?.trim() || "",
      isActive: values.isActive,
      version: editEmployeeQuery.data.version,
    };

    try {
      await updateEmployeeMutation.mutateAsync({
        id: editEmployeeQuery.data.id,
        payload,
      });
      showSuccess(t("messages.updateSuccess"));
      setEditEmployeeId(null);
    } catch (error) {
      handleApiError(error, t("messages.updateError"));
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!window.confirm(t("delete.confirm", { name: employee.name }))) {
      return;
    }

    try {
      await deleteEmployeeMutation.mutateAsync(employee.id);
      showSuccess(t("messages.deleteSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.deleteError"));
    }
  };

  const handleView = useCallback(
    (id: string) => {
      router.push(`/${locale}/employees/${id}`);
    },
    [locale, router]
  );

  const handleExportExcel = async (scope?: ExportScope) => {
    try {
      setIsExporting(true);
      const allItems = await fetchAllMetaItems(
        (currentPage, pageSize) =>
          employeesApi.getAll({
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

      const rows = allItems.map((employee) => ({
        [t("table.name")]: employee.name,
        [t("table.phone")]: employee.phone || "-",
        [t("table.jobTitle")]: employee.jobTitle || "-",
        [t("table.openingBalance")]: formatMoney(employee.openingBalance, locale),
        [t("table.balance")]: formatMoney(employee.balance, locale),
        [t("table.status")]: employee.isActive ? t("status.active") : t("status.inactive"),
      }));

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [26, 18, 22, 18, 18, 14],
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
      <EmployeesToolbar
        searchInput={searchInput}
        statusFilter={statusFilter}
        limit={limit}
        total={meta.total}
        canCreate={canCreate}
        canExport={hasPermission("employees:view")}
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
        isLoading={employeesQuery.isLoading}
        isError={employeesQuery.isError}
        errorMessage={employeesQuery.error?.message}
        isEmpty={!employeesQuery.isLoading && !employeesQuery.isFetching && employees.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={
          canCreate
            ? {
                label: t("actions.addEmployee"),
                onClick: () => setIsCreateOpen(true),
              }
            : undefined
        }
      >
        <EmployeesTable
          employees={employees}
          meta={meta}
          canUpdate={canUpdate}
          canDelete={canDelete}
          deleting={deleteEmployeeMutation.isPending}
          onPageChange={setPage}
          onView={handleView}
          onEdit={setEditEmployeeId}
          onDelete={handleDelete}
        />
      </QueryState>

      <EmployeeCreateModal
        open={isCreateOpen}
        loading={createEmployeeMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <EmployeeEditModal
        open={Boolean(editEmployeeId)}
        employee={editEmployeeQuery.data ?? null}
        loading={editEmployeeQuery.isLoading || updateEmployeeMutation.isPending}
        onClose={() => setEditEmployeeId(null)}
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

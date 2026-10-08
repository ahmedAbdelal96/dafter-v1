"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { suppliersApi } from "@/lib/api/services";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import {
  useSupplier,
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "@/lib/api/hooks/use-suppliers";
import type {
  CreateSupplierRequest,
  Supplier,
  SupplierFilters,
  UpdateSupplierRequest,
} from "@/lib/api/types";
import { SupplierCreateModal } from "./SupplierCreateModal";
import { SupplierEditModal } from "./SupplierEditModal";
import { SuppliersTable } from "./SuppliersTable";
import { SuppliersToolbar } from "./SuppliersToolbar";
import {
  DEFAULT_SUPPLIERS_META,
  type CreateSupplierFormValues,
  type StatusFilter,
  type UpdateSupplierFormValues,
} from "../utils/supplier-schemas";
import { toOptionalNumber } from "../utils/supplier-format";
import { buildSupplierExportRows } from "../utils/supplier-export";

export function SuppliersPageClient() {
  const t = useTranslations("suppliers");
  const locale = useLocale();
  const router = useRouter();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();
  const { hasPermission } = usePermission();

  const canCreate = hasPermission("suppliers:create");
  const canUpdate = hasPermission("suppliers:update");
  const canDelete = hasPermission("suppliers:delete");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editSupplierId, setEditSupplierId] = useState<string | null>(null);

  const filters: SupplierFilters = useMemo(
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

  const suppliersQuery = useSuppliers(filters);
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  const editSupplierQuery = useSupplier(editSupplierId ?? "", Boolean(editSupplierId));

  const suppliers = suppliersQuery.data?.items ?? [];
  const meta = suppliersQuery.data?.meta ?? DEFAULT_SUPPLIERS_META;

  const handleCreate = async (values: CreateSupplierFormValues) => {
    const payload: CreateSupplierRequest = {
      name: values.name.trim(),
      phone: values.phone?.trim() || undefined,
      address: values.address?.trim() || undefined,
      openingBalance: toOptionalNumber(values.openingBalance) ?? 0,
    };

    try {
      await createSupplierMutation.mutateAsync(payload);
      showSuccess(t("messages.createSuccess"));
      setIsCreateOpen(false);
      setSearchInput("");
      setStatusFilter("all");
      setPage(1);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleUpdate = async (values: UpdateSupplierFormValues) => {
    if (!editSupplierQuery.data) return;

    const payload: UpdateSupplierRequest = {
      name: values.name.trim(),
      phone: values.phone?.trim() || null,
      address: values.address?.trim() || null,
      isActive: values.isActive,
      version: editSupplierQuery.data.version,
    };

    try {
      await updateSupplierMutation.mutateAsync({
        id: editSupplierQuery.data.id,
        payload,
      });
      showSuccess(t("messages.updateSuccess"));
      setEditSupplierId(null);
    } catch (error) {
      handleApiError(error, t("messages.updateError"));
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!window.confirm(t("delete.confirm", { name: supplier.name }))) {
      return;
    }

    try {
      await deleteSupplierMutation.mutateAsync(supplier.id);
      showSuccess(t("messages.deleteSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.deleteError"));
    }
  };

  const handleView = useCallback(
    (id: string) => {
      router.push(`/${locale}/suppliers/${id}`);
    },
    [locale, router]
  );

  const handleExportExcel = async (scope?: ExportScope) => {
    try {
      setIsExporting(true);
      const allItems = await fetchAllMetaItems(
        (currentPage, pageSize) =>
          suppliersApi.getAll({
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

      const rows = buildSupplierExportRows(allItems, locale, t);

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [26, 18, 32, 18, 14],
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
      <SuppliersToolbar
        searchInput={searchInput}
        statusFilter={statusFilter}
        limit={limit}
        total={meta.total}
        canCreate={canCreate}
        canExport={hasPermission("suppliers:view")}
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
        isLoading={suppliersQuery.isLoading}
        isError={suppliersQuery.isError}
        errorMessage={suppliersQuery.error?.message}
        isEmpty={!suppliersQuery.isLoading && !suppliersQuery.isFetching && suppliers.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={
          canCreate
            ? {
                label: t("actions.addSupplier"),
                onClick: () => setIsCreateOpen(true),
              }
            : undefined
        }
      >
        <SuppliersTable
          suppliers={suppliers}
          meta={meta}
          canUpdate={canUpdate}
          canDelete={canDelete}
          deleting={deleteSupplierMutation.isPending}
          onPageChange={setPage}
          onView={handleView}
          onEdit={setEditSupplierId}
          onDelete={handleDelete}
        />
      </QueryState>

      <SupplierCreateModal
        open={isCreateOpen}
        loading={createSupplierMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <SupplierEditModal
        open={Boolean(editSupplierId)}
        supplier={editSupplierQuery.data ?? null}
        loading={editSupplierQuery.isLoading || updateSupplierMutation.isPending}
        onClose={() => setEditSupplierId(null)}
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

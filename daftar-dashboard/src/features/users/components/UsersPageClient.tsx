"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { usersApi } from "@/lib/api/services";
import {
  useCreateStaffUser,
  useDisableUser,
  useEnableUser,
  useUpdateUser,
  useUpdateUserPermissions,
  useUsers,
  useUsersStats,
} from "@/lib/api/hooks/use-users";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import type {
  CompanyUser,
  CreateStaffUserRequest,
  UpdateCompanyUserRequest,
  UpdateStaffPermissionsRequest,
  UsersFilters,
  UsersStats,
} from "@/lib/api/types";
import { UsersToolbar } from "./UsersToolbar";
import { UsersStatsCards } from "./UsersStatsCards";
import { UsersTable } from "./UsersTable";
import { UserCreateModal } from "./UserCreateModal";
import { UserEditModal } from "./UserEditModal";
import { UserPermissionsModal } from "./UserPermissionsModal";
import { UserDetailsModal } from "./UserDetailsModal";
import {
  DEFAULT_USERS_META,
  type CreateStaffUserFormValues,
  type UpdateUserFormValues,
  type UpdateUserPermissionsFormValues,
  type UserStatusFilter,
} from "../utils/user-schemas";
import { toStatusFilterValue } from "../utils/user-format";
import { buildUserExportRows } from "../utils/user-export";

const EMPTY_STATS: UsersStats = {
  total: 0,
  active: 0,
  disabled: 0,
  staff: 0,
  owners: 0,
};

export function UsersPageClient() {
  const t = useTranslations("users");
  const locale = useLocale();
  const { hasPermission, hasRole } = usePermission();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();

  const canView = hasPermission("users:view");
  const canCreate = hasPermission("users:create") && hasRole(["OWNER", "SUPER_ADMIN"]);
  const canUpdate = hasPermission("users:update") && hasRole(["OWNER", "SUPER_ADMIN"]);
  const canManagePermissions = hasPermission("users:permissions") && hasRole(["OWNER", "SUPER_ADMIN"]);
  const canToggleStatus = hasPermission("users:disable") && hasRole(["OWNER", "SUPER_ADMIN"]);

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<CompanyUser | null>(null);
  const [editUser, setEditUser] = useState<CompanyUser | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<CompanyUser | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const filters: UsersFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      status: toStatusFilterValue(statusFilter),
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, limit, debouncedSearch, statusFilter],
  );

  const usersQuery = useUsers(filters, canView);
  const statsQuery = useUsersStats(canView && hasRole(["OWNER", "SUPER_ADMIN"]));

  const createMutation = useCreateStaffUser();
  const updateMutation = useUpdateUser();
  const updatePermissionsMutation = useUpdateUserPermissions();
  const disableMutation = useDisableUser();
  const enableMutation = useEnableUser();

  const users = usersQuery.data?.items ?? [];
  const meta = usersQuery.data?.meta ?? DEFAULT_USERS_META;
  const stats = statsQuery.data ?? EMPTY_STATS;

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    updatePermissionsMutation.isPending ||
    disableMutation.isPending ||
    enableMutation.isPending;

  const handleCreate = async (values: CreateStaffUserFormValues) => {
    const payload: CreateStaffUserRequest = {
      fullName: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
      phone: values.phone?.trim() || undefined,
      permissions: {
        manageUsers: values.manageUsers,
        viewParties: values.viewParties,
        manageParties: values.manageParties,
        viewLedger: values.viewLedger,
        manageLedger: values.manageLedger,
        viewReports: values.viewReports,
      },
    };

    try {
      await createMutation.mutateAsync(payload);
      showSuccess(t("messages.createSuccess"));
      setIsCreateOpen(false);
      setSearchInput("");
      setStatusFilter("all");
      setPage(1);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleUpdate = async (values: UpdateUserFormValues) => {
    if (!editUser) return;

    const payload: UpdateCompanyUserRequest = {
      fullName: values.fullName.trim(),
      phone: values.phone?.trim() || null,
    };

    try {
      const updated = await updateMutation.mutateAsync({ id: editUser.id, payload });
      showSuccess(t("messages.updateSuccess"));
      setEditUser(null);
      if (detailsUser?.id === updated.id) setDetailsUser(updated);
    } catch (error) {
      handleApiError(error, t("messages.updateError"));
    }
  };

  const handleUpdatePermissions = async (values: UpdateUserPermissionsFormValues) => {
    if (!permissionsUser) return;

    const payload: UpdateStaffPermissionsRequest = {
      manageUsers: values.manageUsers,
      viewParties: values.viewParties,
      manageParties: values.manageParties,
      viewLedger: values.viewLedger,
      manageLedger: values.manageLedger,
      viewReports: values.viewReports,
    };

    try {
      await updatePermissionsMutation.mutateAsync({ id: permissionsUser.id, payload });
      showSuccess(t("messages.permissionsSuccess"));
      setPermissionsUser(null);
    } catch (error) {
      handleApiError(error, t("messages.permissionsError"));
    }
  };

  const handleDisable = async (user: CompanyUser) => {
    if (!window.confirm(t("messages.disableConfirm", { name: user.fullName }))) return;

    try {
      const updated = await disableMutation.mutateAsync(user.id);
      showSuccess(t("messages.disableSuccess"));
      if (detailsUser?.id === updated.id) setDetailsUser(updated);
    } catch (error) {
      handleApiError(error, t("messages.disableError"));
    }
  };

  const handleEnable = async (user: CompanyUser) => {
    if (!window.confirm(t("messages.enableConfirm", { name: user.fullName }))) return;

    try {
      const updated = await enableMutation.mutateAsync(user.id);
      showSuccess(t("messages.enableSuccess"));
      if (detailsUser?.id === updated.id) setDetailsUser(updated);
    } catch (error) {
      handleApiError(error, t("messages.enableError"));
    }
  };

  const handleExportExcel = async (scope?: ExportScope) => {
    try {
      setIsExporting(true);
      const allItems = await fetchAllMetaItems(
        (currentPage, pageSize) =>
          usersApi.getAll({
            ...filters,
            page: currentPage,
            limit: pageSize,
          }),
        { maxItems: scope?.maxRecords },
      );

      if (allItems.length === 0) {
        showInfo(t("messages.exportEmpty"));
        return;
      }

      const rows = buildUserExportRows(allItems, t);

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [30, 30, 20, 16, 14],
      });

      showSuccess(t("messages.exportSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  if (!canView) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("title")}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("noPermission")}</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <UsersToolbar
        searchInput={searchInput}
        statusFilter={statusFilter}
        limit={limit}
        total={meta.total}
        canCreate={canCreate}
        canExport={canView}
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

      {hasRole(["OWNER", "SUPER_ADMIN"]) && <UsersStatsCards stats={stats} />}

      <QueryState
        isLoading={usersQuery.isLoading}
        isError={usersQuery.isError}
        errorMessage={usersQuery.error?.message}
        isEmpty={!usersQuery.isLoading && !usersQuery.isFetching && users.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={
          canCreate
            ? {
                label: t("actions.addStaff"),
                onClick: () => setIsCreateOpen(true),
              }
            : undefined
        }
      >
        <UsersTable
          users={users}
          meta={meta}
          canUpdate={canUpdate}
          canManagePermissions={canManagePermissions}
          canToggleStatus={canToggleStatus}
          toggling={disableMutation.isPending || enableMutation.isPending}
          onPageChange={setPage}
          onView={setDetailsUser}
          onEdit={setEditUser}
          onPermissions={setPermissionsUser}
          onDisable={(user) => void handleDisable(user)}
          onEnable={(user) => void handleEnable(user)}
        />
      </QueryState>

      <UserCreateModal
        open={isCreateOpen}
        loading={createMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <UserEditModal
        open={Boolean(editUser)}
        user={editUser}
        loading={updateMutation.isPending}
        onClose={() => setEditUser(null)}
        onSubmit={handleUpdate}
      />

      <UserPermissionsModal
        open={Boolean(permissionsUser)}
        user={permissionsUser}
        loading={updatePermissionsMutation.isPending}
        onClose={() => setPermissionsUser(null)}
        onSubmit={handleUpdatePermissions}
      />

      <UserDetailsModal open={Boolean(detailsUser)} user={detailsUser} onClose={() => setDetailsUser(null)} />

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

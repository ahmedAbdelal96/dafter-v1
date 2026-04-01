"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import type { ComboboxOption } from "@/components/ui/combobox/Combobox";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePlatformCompanies } from "@/lib/api/hooks/use-platform";
import {
  useCreatePlatformStaffUser,
  useDisablePlatformUser,
  useEnablePlatformUser,
  usePlatformUsers,
  usePlatformUsersStats,
  useResetPlatformUserCredentials,
  useUpdatePlatformUser,
  useUpdatePlatformUserPermissions,
} from "@/lib/api/hooks/use-platform-users";
import {
  platformUsersApi,
  type PlatformCreateStaffUserRequest,
  type PlatformUpdateUserPermissionsRequest,
  type PlatformUpdateUserRequest,
  type PlatformUsersFilters,
} from "@/lib/api/services/platform-users";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import type {
  CompanyUser,
  UsersStats,
} from "@/lib/api/types/platform";
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
  type ResetCredentialsFormValues,
  type UpdateUserFormValues,
  type UpdateUserPermissionsFormValues,
  type UserStatusFilter,
} from "../utils/user-schemas";
import { toStatusFilterValue } from "../utils/user-format";
import { UserResetCredentialsModal } from "./UserResetCredentialsModal";

const EMPTY_STATS: UsersStats = {
  total: 0,
  active: 0,
  disabled: 0,
  staff: 0,
  owners: 0,
};

export function UsersPageClient() {
  const t = useTranslations("platformUsers");
  const locale = useLocale();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();

  const [companySearchInput, setCompanySearchInput] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(undefined);

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
  const [resetCredentialsUser, setResetCredentialsUser] = useState<CompanyUser | null>(null);

  const debouncedCompanySearch = useDebouncedValue(companySearchInput, 350);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const companiesQuery = usePlatformCompanies(
    {
      page: 1,
      limit: 100,
      search: debouncedCompanySearch || undefined,
      sortBy: "name",
      sortOrder: "asc",
    },
    true,
  );

  const companyOptions = useMemo<ComboboxOption[]>(() => {
    return (companiesQuery.data?.items ?? []).map((company) => ({
      value: company.id,
      label: company.name,
      description: company.phone || company.address || undefined,
    }));
  }, [companiesQuery.data?.items]);

  useEffect(() => {
    if (selectedCompanyId) return;
    if (companyOptions.length === 0) return;
    setSelectedCompanyId(companyOptions[0].value);
  }, [companyOptions, selectedCompanyId]);

  const selectedCompany = useMemo(
    () => (companiesQuery.data?.items ?? []).find((company) => company.id === selectedCompanyId),
    [companiesQuery.data?.items, selectedCompanyId],
  );

  const hasSelectedCompany = Boolean(selectedCompanyId);

  const filters: PlatformUsersFilters = useMemo(
    () => ({
      companyId: selectedCompanyId ?? "",
      page,
      limit,
      search: debouncedSearch || undefined,
      status: toStatusFilterValue(statusFilter),
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [selectedCompanyId, page, limit, debouncedSearch, statusFilter],
  );

  const usersQuery = usePlatformUsers(filters, hasSelectedCompany);
  const statsQuery = usePlatformUsersStats(selectedCompanyId ?? "", hasSelectedCompany);

  const createMutation = useCreatePlatformStaffUser();
  const updateMutation = useUpdatePlatformUser();
  const updatePermissionsMutation = useUpdatePlatformUserPermissions();
  const disableMutation = useDisablePlatformUser();
  const enableMutation = useEnablePlatformUser();
  const resetCredentialsMutation = useResetPlatformUserCredentials();

  const users = usersQuery.data?.items ?? [];
  const meta = usersQuery.data?.meta ?? DEFAULT_USERS_META;
  const stats = statsQuery.data ?? EMPTY_STATS;

  const handleCompanyChange = (value?: string) => {
    setSelectedCompanyId(value);
    setSearchInput("");
    setStatusFilter("all");
    setPage(1);
    setDetailsUser(null);
    setEditUser(null);
    setPermissionsUser(null);
    setResetCredentialsUser(null);
  };

  const handleCreate = async (values: CreateStaffUserFormValues) => {
    if (!selectedCompanyId) {
      showInfo(t("emptyCompany.description"));
      return;
    }

    const payload: PlatformCreateStaffUserRequest = {
      companyId: selectedCompanyId,
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
    if (!editUser || !selectedCompanyId) return;

    const payload: PlatformUpdateUserRequest = {
      companyId: selectedCompanyId,
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
    if (!permissionsUser || !selectedCompanyId) return;

    const payload: PlatformUpdateUserPermissionsRequest = {
      companyId: selectedCompanyId,
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
    if (!selectedCompanyId) return;
    if (!window.confirm(t("messages.disableConfirm", { name: user.fullName }))) return;

    try {
      const updated = await disableMutation.mutateAsync({ id: user.id, scope: { companyId: selectedCompanyId } });
      showSuccess(t("messages.disableSuccess"));
      if (detailsUser?.id === updated.id) setDetailsUser(updated);
    } catch (error) {
      handleApiError(error, t("messages.disableError"));
    }
  };

  const handleEnable = async (user: CompanyUser) => {
    if (!selectedCompanyId) return;
    if (!window.confirm(t("messages.enableConfirm", { name: user.fullName }))) return;

    try {
      const updated = await enableMutation.mutateAsync({ id: user.id, scope: { companyId: selectedCompanyId } });
      showSuccess(t("messages.enableSuccess"));
      if (detailsUser?.id === updated.id) setDetailsUser(updated);
    } catch (error) {
      handleApiError(error, t("messages.enableError"));
    }
  };

  const handleResetCredentials = async (values: ResetCredentialsFormValues) => {
    if (!selectedCompanyId || !resetCredentialsUser) return;

    try {
      const result = await resetCredentialsMutation.mutateAsync({
        id: resetCredentialsUser.id,
        payload: {
          companyId: selectedCompanyId,
          channel: values.channel,
          reason: values.reason?.trim() || undefined,
        },
      });

      showSuccess(
        t("messages.resetSuccess", {
          channel: t(`channels.${result.channel}`),
        }),
      );
      setResetCredentialsUser(null);
    } catch (error) {
      handleApiError(error, t("messages.resetError"));
    }
  };

  const handleExportExcel = async (scope?: ExportScope) => {
    if (!selectedCompanyId) return;

    try {
      setIsExporting(true);
      const allItems = await fetchAllMetaItems(
        (currentPage, pageSize) =>
          platformUsersApi.getAll({
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

      const rows = allItems.map((user) => ({
        [t("table.fullName")]: user.fullName,
        [t("table.email")]: user.email,
        [t("table.phone")]: user.phone || "-",
        [t("table.role")]: t(`role.${user.role}`),
        [t("table.status")]: t(`status.${user.status}`),
      }));

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

  return (
    <div className="space-y-6">
      <UsersToolbar
        searchInput={searchInput}
        selectedCompanyId={selectedCompanyId}
        companyOptions={companyOptions}
        companiesLoading={companiesQuery.isLoading}
        statusFilter={statusFilter}
        limit={limit}
        total={meta.total}
        canCreate
        canExport
        isExporting={isExporting}
        onSearchChange={(value) => {
          setSearchInput(value);
          setPage(1);
        }}
        onCompanySearchChange={setCompanySearchInput}
        onCompanyChange={handleCompanyChange}
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

      {!hasSelectedCompany && !companiesQuery.isLoading && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("emptyCompany.title")}</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("emptyCompany.description")}</p>
        </section>
      )}

      {hasSelectedCompany && <UsersStatsCards stats={stats} />}

      <QueryState
        isLoading={hasSelectedCompany ? usersQuery.isLoading : false}
        isError={usersQuery.isError}
        errorMessage={usersQuery.error?.message}
        isEmpty={hasSelectedCompany && !usersQuery.isLoading && !usersQuery.isFetching && users.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={{
          label: t("actions.addStaff"),
          onClick: () => setIsCreateOpen(true),
        }}
      >
        <UsersTable
          users={users}
          meta={meta}
          canUpdate
          canManagePermissions
          canResetCredentials
          canToggleStatus
          toggling={disableMutation.isPending || enableMutation.isPending}
          resettingCredentials={resetCredentialsMutation.isPending}
          onPageChange={setPage}
          onView={setDetailsUser}
          onEdit={setEditUser}
          onPermissions={setPermissionsUser}
          onResetCredentials={setResetCredentialsUser}
          onDisable={(user) => void handleDisable(user)}
          onEnable={(user) => void handleEnable(user)}
        />
      </QueryState>

      <UserCreateModal
        open={isCreateOpen}
        loading={createMutation.isPending}
        selectedCompanyId={selectedCompanyId}
        companyOptions={companyOptions}
        companiesLoading={companiesQuery.isLoading || companiesQuery.isFetching}
        onClose={() => setIsCreateOpen(false)}
        onCompanyChange={handleCompanyChange}
        onCompanySearchChange={setCompanySearchInput}
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

      <UserResetCredentialsModal
        open={Boolean(resetCredentialsUser)}
        user={resetCredentialsUser}
        loading={resetCredentialsMutation.isPending}
        onClose={() => setResetCredentialsUser(null)}
        onSubmit={handleResetCredentials}
      />

      <UserDetailsModal
        open={Boolean(detailsUser)}
        user={detailsUser}
        companyName={selectedCompany?.name}
        onClose={() => setDetailsUser(null)}
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

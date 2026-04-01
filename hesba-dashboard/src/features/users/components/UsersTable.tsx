"use client";

import { useMemo } from "react";
import { Eye, Pencil, Shield, UserCheck, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import Badge from "@/components/ui/badge/Badge";
import type { CompanyUser, UsersListMeta } from "@/lib/api/types";

interface UsersTableProps {
  users: CompanyUser[];
  meta: UsersListMeta;
  canUpdate: boolean;
  canManagePermissions: boolean;
  canToggleStatus: boolean;
  toggling: boolean;
  onPageChange: (page: number) => void;
  onView: (user: CompanyUser) => void;
  onEdit: (user: CompanyUser) => void;
  onPermissions: (user: CompanyUser) => void;
  onDisable: (user: CompanyUser) => void;
  onEnable: (user: CompanyUser) => void;
}

export function UsersTable({
  users,
  meta,
  canUpdate,
  canManagePermissions,
  canToggleStatus,
  toggling,
  onPageChange,
  onView,
  onEdit,
  onPermissions,
  onDisable,
  onEnable,
}: UsersTableProps) {
  const t = useTranslations("users");

  const columns = useMemo(
    () => [
      {
        id: "fullName",
        header: t("table.fullName"),
        accessor: (row: CompanyUser) => row.fullName,
        cell: (row: CompanyUser) => (
          <button className="font-medium text-text-brand hover:underline" onClick={() => onView(row)}>
            {row.fullName}
          </button>
        ),
      },
      {
        id: "email",
        header: t("table.email"),
        accessor: (row: CompanyUser) => row.email,
      },
      {
        id: "phone",
        header: t("table.phone"),
        accessor: (row: CompanyUser) => row.phone || "-",
      },
      {
        id: "role",
        header: t("table.role"),
        accessor: (row: CompanyUser) => t(`role.${row.role}`),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row: CompanyUser) => row.status,
        cell: (row: CompanyUser) => (
          <Badge color={row.status === "ACTIVE" ? "success" : "warning"}>{t(`status.${row.status}`)}</Badge>
        ),
      },
    ],
    [onView, t],
  );

  return (
    <DataTable<CompanyUser>
      data={users}
      columns={columns}
      getRowId={(row) => row.id}
      rowActions={(row) => (
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            onClick={() => onView(row)}
            title={t("actions.view")}
          >
            <Eye size={16} />
          </button>

          {canUpdate && (
            <button
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              onClick={() => onEdit(row)}
              title={t("actions.edit")}
            >
              <Pencil size={16} />
            </button>
          )}

          {canManagePermissions && row.role === "STAFF" && (
            <button
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              onClick={() => onPermissions(row)}
              title={t("actions.permissions")}
            >
              <Shield size={16} />
            </button>
          )}

          {canToggleStatus && row.status === "ACTIVE" && (
            <button
              className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50"
              onClick={() => onDisable(row)}
              title={t("actions.disable")}
              disabled={toggling}
            >
              <UserX size={16} />
            </button>
          )}

          {canToggleStatus && row.status === "DISABLED" && (
            <button
              className="rounded-md p-1.5 text-success-600 transition hover:bg-success-50"
              onClick={() => onEnable(row)}
              title={t("actions.enable")}
              disabled={toggling}
            >
              <UserCheck size={16} />
            </button>
          )}
        </div>
      )}
      pagination={{
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages: meta.totalPages,
        hasNextPage: meta.hasNext,
        hasPrevPage: meta.hasPrev,
      }}
      onPageChange={onPageChange}
      ariaLabel={t("table.ariaLabel")}
    />
  );
}

import type { CompanyUser } from "@/lib/api/types";
import type { ExportRow, ExportTranslator } from "@/lib/export/export-shaping";

export function buildUserExportRows(users: CompanyUser[], t: ExportTranslator): ExportRow[] {
  return users.map((user) => ({
    [t("table.fullName")]: user.fullName,
    [t("table.email")]: user.email,
    [t("table.phone")]: user.phone || "-",
    [t("table.role")]: t(`role.${user.role}`),
    [t("table.status")]: t(`status.${user.status}`),
  }));
}

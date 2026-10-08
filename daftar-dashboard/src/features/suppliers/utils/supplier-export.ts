import type { Supplier } from "@/lib/api/types";
import type { ExportRow, ExportTranslator } from "@/lib/export/export-shaping";
import { formatMoney } from "./supplier-format";

export function buildSupplierExportRows(
  suppliers: Supplier[],
  locale: string,
  t: ExportTranslator
): ExportRow[] {
  return suppliers.map((supplier) => ({
    [t("table.name")]: supplier.name,
    [t("table.phone")]: supplier.phone || "-",
    [t("table.address")]: supplier.address || "-",
    [t("table.balance")]: formatMoney(supplier.balance, locale),
    [t("table.status")]: supplier.isActive ? t("status.active") : t("status.inactive"),
  }));
}

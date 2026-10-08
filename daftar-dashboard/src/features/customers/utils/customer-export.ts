import type { Customer } from "@/lib/api/types";
import type { ExportRow, ExportTranslator } from "@/lib/export/export-shaping";
import { formatMoney } from "./customer-format";

export function buildCustomerExportRows(
  customers: Customer[],
  locale: string,
  t: ExportTranslator
): ExportRow[] {
  return customers.map((customer) => ({
    [t("table.name")]: customer.name,
    [t("table.phone")]: customer.phone || "-",
    [t("table.address")]: customer.address || "-",
    [t("table.balance")]: formatMoney(customer.balance, locale),
    [t("table.creditLimit")]:
      customer.creditLimit == null
        ? t("table.noLimit")
        : formatMoney(customer.creditLimit, locale),
    [t("table.status")]: customer.isActive ? t("status.active") : t("status.inactive"),
  }));
}

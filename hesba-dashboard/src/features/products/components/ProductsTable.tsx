"use client";

import { useMemo } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import Badge from "@/components/ui/badge/Badge";
import type { Product, ProductsListMeta } from "@/lib/api/types";
import { formatMoney } from "../utils/product-format";

interface ProductsTableProps {
  products: Product[];
  meta: ProductsListMeta;
  canUpdate: boolean;
  canDelete: boolean;
  deleting: boolean;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (product: Product) => void;
}

export function ProductsTable({
  products,
  meta,
  canUpdate,
  canDelete,
  deleting,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  const t = useTranslations("products");
  const locale = useLocale();

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: t("table.name"),
        accessor: (row: Product) => row.name,
        cell: (row: Product) => (
          <button
            className="font-medium text-text-brand hover:underline"
            onClick={() => onView(row.id)}
          >
            {row.name}
          </button>
        ),
      },
      {
        id: "sku",
        header: t("table.sku"),
        accessor: (row: Product) => row.sku || "-",
      },
      {
        id: "category",
        header: t("table.category"),
        accessor: (row: Product) => row.category || "-",
      },
      {
        id: "unit",
        header: t("table.unit"),
        accessor: (row: Product) => row.unit || "-",
      },
      {
        id: "unitPrice",
        header: t("table.unitPrice"),
        accessor: (row: Product) => formatMoney(row.unitPrice, locale),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row: Product) => row.isActive,
        cell: (row: Product) => (
          <Badge color={row.isActive ? "success" : "light"}>
            {row.isActive ? t("status.active") : t("status.inactive")}
          </Badge>
        ),
      },
    ],
    [locale, onView, t]
  );

  return (
    <DataTable<Product>
      data={products}
      columns={columns}
      getRowId={(row) => row.id}
      rowActions={(row) => (
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            onClick={() => onView(row.id)}
            title={t("actions.view")}
          >
            <Eye size={16} />
          </button>
          {canUpdate && (
            <button
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              onClick={() => onEdit(row.id)}
              title={t("actions.edit")}
            >
              <Pencil size={16} />
            </button>
          )}
          {canDelete && (
            <button
              className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
              onClick={() => onDelete(row)}
              title={t("actions.delete")}
              disabled={deleting}
            >
              <Trash2 size={16} />
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

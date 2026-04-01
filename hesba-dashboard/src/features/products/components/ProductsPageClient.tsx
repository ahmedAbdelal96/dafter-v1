"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { productsApi } from "@/lib/api/services";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import {
  useProduct,
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/lib/api/hooks/use-products";
import type {
  Product,
  ProductFilters,
  CreateProductRequest,
  UpdateProductRequest,
} from "@/lib/api/types";
import { ProductCreateModal } from "./ProductCreateModal";
import { ProductEditModal } from "./ProductEditModal";
import { ProductsTable } from "./ProductsTable";
import { ProductsToolbar } from "./ProductsToolbar";
import {
  DEFAULT_PRODUCTS_META,
  type CreateProductFormValues,
  type StatusFilter,
  type UpdateProductFormValues,
} from "../utils/product-schemas";
import { formatMoney, toNullableString, toOptionalString, toOptionalNumber } from "../utils/product-format";

export function ProductsPageClient() {
  const t = useTranslations("products");
  const locale = useLocale();
  const router = useRouter();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();
  const { hasPermission, hasRole } = usePermission();

  const canCreate = hasPermission("products:create");
  const canUpdate = hasPermission("products:update");
  const canDelete = hasPermission("products:delete") && hasRole("OWNER");

  const [searchInput, setSearchInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);

  const filters: ProductFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      category: categoryInput.trim() || undefined,
      isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, limit, debouncedSearch, categoryInput, statusFilter]
  );

  const productsQuery = useProducts(filters);
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  const editProductQuery = useProduct(editProductId ?? "", Boolean(editProductId));
  const products = productsQuery.data?.items ?? [];
  const meta = productsQuery.data?.meta ?? DEFAULT_PRODUCTS_META;

  const handleCreate = async (values: CreateProductFormValues) => {
    const payload: CreateProductRequest = {
      name: values.name.trim(),
      description: toOptionalString(values.description),
      sku: toOptionalString(values.sku),
      category: toOptionalString(values.category),
      unit: toOptionalString(values.unit),
      unitPrice: toOptionalNumber(values.unitPrice) ?? 0,
      isActive: values.isActive ?? true,
    };

    try {
      await createProductMutation.mutateAsync(payload);
      showSuccess(t("messages.createSuccess"));
      setIsCreateOpen(false);
      setSearchInput("");
      setCategoryInput("");
      setStatusFilter("all");
      setPage(1);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleUpdate = async (values: UpdateProductFormValues) => {
    if (!editProductQuery.data) return;

    const payload: UpdateProductRequest = {
      name: values.name.trim(),
      description: toNullableString(values.description),
      sku: toNullableString(values.sku),
      category: toNullableString(values.category),
      unit: toNullableString(values.unit),
      unitPrice: toOptionalNumber(values.unitPrice),
      isActive: values.isActive,
    };

    try {
      await updateProductMutation.mutateAsync({
        id: editProductQuery.data.id,
        payload,
      });
      showSuccess(t("messages.updateSuccess"));
      setEditProductId(null);
    } catch (error) {
      handleApiError(error, t("messages.updateError"));
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(t("delete.confirm", { name: product.name }))) {
      return;
    }

    try {
      await deleteProductMutation.mutateAsync(product.id);
      showSuccess(t("messages.deleteSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.deleteError"));
    }
  };

  const handleView = useCallback(
    (id: string) => {
      router.push(`/${locale}/products/${id}`);
    },
    [locale, router]
  );

  const handleExportExcel = async (scope?: ExportScope) => {
    try {
      setIsExporting(true);
      const allItems = await fetchAllMetaItems(
        (currentPage, pageSize) =>
          productsApi.getAll({
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

      const rows = allItems.map((product) => ({
        [t("table.name")]: product.name,
        [t("table.sku")]: product.sku || "-",
        [t("table.category")]: product.category || "-",
        [t("table.unit")]: product.unit || "-",
        [t("table.unitPrice")]: formatMoney(product.unitPrice, locale),
        [t("table.status")]: product.isActive ? t("status.active") : t("status.inactive"),
      }));

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [28, 18, 18, 14, 16, 14],
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
      <ProductsToolbar
        searchInput={searchInput}
        categoryInput={categoryInput}
        statusFilter={statusFilter}
        limit={limit}
        total={meta.total}
        canCreate={canCreate}
        canExport={hasPermission("products:view")}
        isExporting={isExporting}
        onSearchChange={(value) => {
          setSearchInput(value);
          setPage(1);
        }}
        onCategoryChange={(value) => {
          setCategoryInput(value);
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
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        errorMessage={productsQuery.error?.message}
        isEmpty={!productsQuery.isLoading && !productsQuery.isFetching && products.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={
          canCreate
            ? {
                label: t("actions.addProduct"),
                onClick: () => setIsCreateOpen(true),
              }
            : undefined
        }
      >
        <ProductsTable
          products={products}
          meta={meta}
          canUpdate={canUpdate}
          canDelete={canDelete}
          deleting={deleteProductMutation.isPending}
          onPageChange={setPage}
          onView={handleView}
          onEdit={setEditProductId}
          onDelete={handleDelete}
        />
      </QueryState>

      <ProductCreateModal
        open={isCreateOpen}
        loading={createProductMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <ProductEditModal
        open={Boolean(editProductId)}
        product={editProductQuery.data ?? null}
        loading={editProductQuery.isLoading || updateProductMutation.isPending}
        onClose={() => setEditProductId(null)}
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

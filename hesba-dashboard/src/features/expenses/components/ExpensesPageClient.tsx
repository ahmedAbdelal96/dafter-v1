"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ComboboxOption } from "@/components/ui/combobox/Combobox";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { API_LIMITS } from "@/lib/api/config";
import { useSuppliers } from "@/lib/api/hooks/use-suppliers";
import {
  useExpense,
  useExpenses,
  useExpensesSummary,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "@/lib/api/hooks/use-expenses";
import { expensesApi } from "@/lib/api/services";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import type {
  CreateExpenseRequestPayload,
  ExpenseCategoryValue,
  ExpenseFilters,
  ExpenseRecord,
  UpdateExpenseRequestPayload,
} from "@/lib/api/types";
import { ExpenseCreateModal } from "./ExpenseCreateModal";
import { ExpenseEditModal } from "./ExpenseEditModal";
import { ExpensesSummaryCards } from "./ExpensesSummaryCards";
import { ExpensesTable } from "./ExpensesTable";
import { ExpensesToolbar } from "./ExpensesToolbar";
import {
  DEFAULT_EXPENSES_META,
  type CreateExpenseFormValues,
  type UpdateExpenseFormValues,
} from "../utils/expense-schemas";
import { toOptionalNumber, toOptionalString } from "../utils/expense-format";

export function ExpensesPageClient() {
  const t = useTranslations("expenses");
  const locale = useLocale();
  const router = useRouter();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();
  const { hasPermission, hasRole } = usePermission();

  const canCreate = hasPermission("ledger:create");
  const canUpdate = hasPermission("ledger:create");
  const canDelete = hasPermission("ledger:delete") && hasRole("OWNER");

  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategoryValue | undefined>(
    undefined
  );
  const [supplierFilter, setSupplierFilter] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);

  const filters: ExpenseFilters = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      category: categoryFilter,
      supplierId: supplierFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [page, limit, debouncedSearch, categoryFilter, supplierFilter, dateFrom, dateTo]
  );

  const suppliersQuery = useSuppliers({
    page: 1,
    limit: API_LIMITS.LOOKUP_LIMIT,
    sortBy: "name",
    sortOrder: "asc",
  });
  const expensesQuery = useExpenses(filters);
  const summaryQuery = useExpensesSummary(filters);
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const editExpenseQuery = useExpense(editExpenseId ?? "", Boolean(editExpenseId));

  const expenses = expensesQuery.data?.items ?? [];
  const meta = expensesQuery.data?.meta ?? DEFAULT_EXPENSES_META;

  const supplierOptions = useMemo<ComboboxOption[]>(
    () =>
      (suppliersQuery.data?.items ?? []).map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    [suppliersQuery.data?.items]
  );

  const handleCreate = async (values: CreateExpenseFormValues) => {
    const payload: CreateExpenseRequestPayload = {
      category: values.category,
      amount: toOptionalNumber(values.amount) ?? 0,
      expenseDate: values.expenseDate,
      description: toOptionalString(values.description),
      supplierId: toOptionalString(values.supplierId),
      referenceNumber: toOptionalString(values.referenceNumber),
      paymentMethod: toOptionalString(values.paymentMethod),
      notes: toOptionalString(values.notes),
    };

    try {
      await createExpenseMutation.mutateAsync(payload);
      showSuccess(t("messages.createSuccess"));
      setIsCreateOpen(false);
      setSearchInput("");
      setCategoryFilter(undefined);
      setSupplierFilter(undefined);
      setDateFrom("");
      setDateTo("");
      setPage(1);
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const handleUpdate = async (values: UpdateExpenseFormValues) => {
    if (!editExpenseQuery.data) return;

    const payload: UpdateExpenseRequestPayload = {
      category: values.category,
      amount: toOptionalNumber(values.amount),
      expenseDate: toOptionalString(values.expenseDate),
      description: toOptionalString(values.description),
      supplierId: toOptionalString(values.supplierId),
      referenceNumber: toOptionalString(values.referenceNumber),
      paymentMethod: toOptionalString(values.paymentMethod),
      notes: toOptionalString(values.notes),
    };

    try {
      await updateExpenseMutation.mutateAsync({
        id: editExpenseQuery.data.id,
        payload,
      });
      showSuccess(t("messages.updateSuccess"));
      setEditExpenseId(null);
    } catch (error) {
      handleApiError(error, t("messages.updateError"));
    }
  };

  const handleDelete = async (expense: ExpenseRecord) => {
    if (!window.confirm(t("delete.confirm", { id: expense.id }))) {
      return;
    }

    try {
      await deleteExpenseMutation.mutateAsync(expense.id);
      showSuccess(t("messages.deleteSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.deleteError"));
    }
  };

  const handleView = useCallback(
    (id: string) => {
      router.push(`/${locale}/expenses/${id}`);
    },
    [locale, router]
  );

  const handleExportExcel = async (scope?: ExportScope) => {
    try {
      setIsExporting(true);
      const exportFilters: ExpenseFilters = {
        ...filters,
        dateFrom: scope?.dateFrom ?? filters.dateFrom,
        dateTo: scope?.dateTo ?? filters.dateTo,
      };
      const allItems: ExpenseRecord[] = await fetchAllMetaItems((currentPage, pageSize) =>
        expensesApi.getAll({
          ...exportFilters,
          page: currentPage,
          limit: pageSize,
        }),
        { maxItems: scope?.maxRecords }
      );

      if (allItems.length === 0) {
        showInfo(t("messages.exportEmpty"));
        return;
      }

      const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });

      const rows = allItems.map((item) => ({
        [t("table.expenseDate")]: dateFormatter.format(new Date(item.expenseDate)),
        [t("table.category")]: t(`categories.${item.category}`),
        [t("table.amount")]: Number(item.amount),
        [t("table.supplier")]: item.supplier?.name || "-",
        [t("table.paymentMethod")]: item.paymentMethod || "-",
        [t("table.referenceNumber")]: item.referenceNumber || "-",
        [t("table.description")]: item.description || "-",
        [t("table.notes")]: item.notes || "-",
      }));

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [18, 18, 14, 26, 18, 18, 36, 36],
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
      <ExpensesToolbar
        searchInput={searchInput}
        categoryFilter={categoryFilter}
        supplierFilter={supplierFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        limit={limit}
        total={meta.total}
        supplierOptions={supplierOptions}
        canCreate={canCreate}
        isExporting={isExporting}
        onSearchChange={(value) => {
          setSearchInput(value);
          setPage(1);
        }}
        onCategoryChange={(value) => {
          setCategoryFilter(value);
          setPage(1);
        }}
        onSupplierChange={(value) => {
          setSupplierFilter(value);
          setPage(1);
        }}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(1);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(1);
        }}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        onCreateClick={() => setIsCreateOpen(true)}
        onExportClick={() => setIsExportScopeOpen(true)}
      />

      <ExpensesSummaryCards summary={summaryQuery.data} />

      <QueryState
        isLoading={expensesQuery.isLoading}
        isError={expensesQuery.isError}
        errorMessage={expensesQuery.error?.message}
        isEmpty={!expensesQuery.isLoading && !expensesQuery.isFetching && expenses.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyAction={
          canCreate
            ? {
                label: t("actions.addExpense"),
                onClick: () => setIsCreateOpen(true),
              }
            : undefined
        }
      >
        <ExpensesTable
          expenses={expenses}
          meta={meta}
          canUpdate={canUpdate}
          canDelete={canDelete}
          deleting={deleteExpenseMutation.isPending}
          onPageChange={setPage}
          onView={handleView}
          onEdit={setEditExpenseId}
          onDelete={handleDelete}
        />
      </QueryState>

      <ExpenseCreateModal
        open={isCreateOpen}
        loading={createExpenseMutation.isPending}
        supplierOptions={supplierOptions}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <ExpenseEditModal
        open={Boolean(editExpenseId)}
        expense={editExpenseQuery.data ?? null}
        loading={editExpenseQuery.isLoading || updateExpenseMutation.isPending}
        supplierOptions={supplierOptions}
        onClose={() => setEditExpenseId(null)}
        onSubmit={handleUpdate}
      />

      <ExportScopeModal
        open={isExportScopeOpen}
        loading={isExporting}
        initialScope={{
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        }}
        labels={{
          title: t("exportModal.title"),
          description: `${t("exportModal.description")} (${meta.total})`,
          fromDate: t("exportModal.fromDate"),
          toDate: t("exportModal.toDate"),
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

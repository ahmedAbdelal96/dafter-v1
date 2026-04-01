/**
 * DataTable Pagination Component
 *
 * Reusable pagination controls for the DataTable.
 */

"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationConfig } from "./types";
import { getPaginationPages, isRTL } from "./utils";

interface DataTablePaginationProps {
  pagination: PaginationConfig;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function DataTablePagination({
  pagination,
  onPageChange,
  loading = false,
}: DataTablePaginationProps) {
  const t = useTranslations("common");
  const rtl = isRTL();

  const { page, totalPages, total, hasNextPage, hasPrevPage } = pagination;

  const normalizedTotalPages = Math.max(1, totalPages);
  const pages = getPaginationPages(page, normalizedTotalPages);
  const start = (page - 1) * pagination.limit + 1;
  const end = Math.min(page * pagination.limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-border-light px-6 py-4 sm:flex-row">
      <div className="text-sm text-text-secondary">
        {t("dataTable.showingRange", { start, end, total })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage || loading}
          className="flex items-center gap-1 rounded-xl border border-border-light bg-surface-secondary px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-strong dark:bg-surface-secondary dark:hover:bg-surface-tertiary"
          aria-label={t("dataTable.previousPage")}
        >
          {rtl ? (
            <>
              <ChevronRight className="h-4 w-4" />
              <span>{t("actions.previous")}</span>
            </>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>{t("actions.previous")}</span>
            </>
          )}
        </button>

        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((pageNum, index) => {
            if (pageNum === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-3 py-1 text-sm text-text-muted"
                >
                  ...
                </span>
              );
            }

            const isActive = pageNum === page;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                disabled={loading}
                className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-white shadow-theme-xs"
                    : "text-text-primary hover:bg-surface-tertiary"
                } disabled:cursor-not-allowed disabled:opacity-50`}
                aria-label={t("dataTable.pageNumber", { page: pageNum })}
                aria-current={isActive ? "page" : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <div className="px-3 py-1 text-sm text-text-secondary sm:hidden">
          {page} / {normalizedTotalPages}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage || loading}
          className="flex items-center gap-1 rounded-xl border border-border-light bg-surface-secondary px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-strong dark:bg-surface-secondary dark:hover:bg-surface-tertiary"
          aria-label={t("dataTable.nextPage")}
        >
          {rtl ? (
            <>
              <span>{t("actions.next")}</span>
              <ChevronLeft className="h-4 w-4" />
            </>
          ) : (
            <>
              <span>{t("actions.next")}</span>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

import { API_LIMITS } from "@/lib/api/config";

type ListMeta = {
  total: number;
  totalPages?: number;
};

type MetaListResponse<TItem> = {
  items: TItem[];
  meta: ListMeta;
};

type TotalListResponse<TItem> = {
  items: TItem[];
  total: number;
};

interface ExportWorkbookOptions {
  locale: string;
  sheetName: string;
  filePrefix: string;
  columnWidths?: number[];
}

interface ExportWorkbookSheet {
  sheetName: string;
  rows: Record<string, unknown>[];
  columnWidths?: number[];
}

interface ExportMultiSheetWorkbookOptions {
  locale: string;
  filePrefix: string;
  sheets: ExportWorkbookSheet[];
}

interface FetchAllPagesOptions {
  pageSize?: number;
  maxPages?: number;
  maxItems?: number;
}

export async function fetchAllMetaItems<TItem>(
  fetchPage: (page: number, limit: number) => Promise<MetaListResponse<TItem>>,
  options: FetchAllPagesOptions = {}
): Promise<TItem[]> {
  const pageSize = options.pageSize ?? API_LIMITS.EXPORT_PAGE_SIZE;
  const maxPages = options.maxPages ?? 500;
  let currentPage = 1;
  let totalPages = 1;
  const allItems: TItem[] = [];

  while (currentPage <= totalPages && currentPage <= maxPages) {
    const response = await fetchPage(currentPage, pageSize);
    allItems.push(...response.items);
    if (options.maxItems && allItems.length >= options.maxItems) {
      return allItems.slice(0, options.maxItems);
    }

    const fromMeta = response.meta.totalPages ?? 0;
    const fromTotal =
      response.meta.total > 0
        ? Math.ceil(response.meta.total / Math.max(pageSize, 1))
        : 1;
    totalPages = Math.max(1, fromMeta, fromTotal);
    currentPage += 1;
  }

  return allItems;
}

export async function fetchAllTotalItems<TItem>(
  fetchPage: (page: number, limit: number) => Promise<TotalListResponse<TItem>>,
  options: FetchAllPagesOptions = {}
): Promise<TItem[]> {
  const pageSize = options.pageSize ?? API_LIMITS.EXPORT_PAGE_SIZE;
  const maxPages = options.maxPages ?? 500;
  let currentPage = 1;
  let totalPages = 1;
  const allItems: TItem[] = [];

  while (currentPage <= totalPages && currentPage <= maxPages) {
    const response = await fetchPage(currentPage, pageSize);
    allItems.push(...response.items);
    if (options.maxItems && allItems.length >= options.maxItems) {
      return allItems.slice(0, options.maxItems);
    }
    totalPages = Math.max(1, Math.ceil(Math.max(response.total, 0) / Math.max(pageSize, 1)));
    currentPage += 1;
  }

  return allItems;
}

export async function exportRowsToExcel(
  rows: Record<string, unknown>[],
  options: ExportWorkbookOptions
): Promise<void> {
  downloadCsv(rows, options.filePrefix);
}

export async function exportWorkbookToExcel(
  options: ExportMultiSheetWorkbookOptions,
): Promise<void> {
  downloadCsv(options.sheets.flatMap((sheet) => sheet.rows), options.filePrefix);
}

function downloadCsv(rows: Record<string, unknown>[], filePrefix: string): void {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeFileName(filePrefix)}_${new Date().toISOString().split("T")[0]}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sanitizeFileName(input: string): string {
  const value = input.trim();
  if (!value) return "export";
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

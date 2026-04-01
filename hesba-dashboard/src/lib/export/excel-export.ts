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
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  if (options.columnWidths?.length) {
    worksheet["!cols"] = options.columnWidths.map((width) => ({ wch: width }));
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName);

  // Keep workbook direction aligned with selected locale for better Arabic readability.
  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
  workbook.Workbook.Views[0] = { RTL: options.locale === "ar" };

  const datePart = new Date().toISOString().split("T")[0];
  const safePrefix = sanitizeFileName(options.filePrefix);
  XLSX.writeFile(workbook, `${safePrefix}_${datePart}.xlsx`);
}

export async function exportWorkbookToExcel(
  options: ExportMultiSheetWorkbookOptions,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  for (const sheet of options.sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    if (sheet.columnWidths?.length) {
      worksheet["!cols"] = sheet.columnWidths.map((width) => ({ wch: width }));
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
  }

  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
  workbook.Workbook.Views[0] = { RTL: options.locale === "ar" };

  const datePart = new Date().toISOString().split("T")[0];
  const safePrefix = sanitizeFileName(options.filePrefix);
  XLSX.writeFile(workbook, `${safePrefix}_${datePart}.xlsx`);
}

function sanitizeFileName(input: string): string {
  const value = input.trim();
  if (!value) return "export";
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

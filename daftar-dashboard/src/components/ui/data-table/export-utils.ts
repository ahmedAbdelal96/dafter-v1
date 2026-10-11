/**
 * CSV Export Utilities
 * 
 * Utilities for exporting table data to CSV format.
 * Supports customizable columns, formatting, and RTL content.
 * 
 * 
 * @author Senior Development Team
 */

import type { ColumnDef } from './types';

/**
 * Export data to CSV file
 * 
 * @param data - Array of data objects to export
 * @param columns - Column definitions for headers and formatting
 * @param filename - Output filename (without extension)
 * @param sheetName - Retained for API compatibility.
 */
export async function exportToExcel<T = any>(
  data: T[],
  columns: ColumnDef<T>[],
  filename: string = 'export',
  sheetName: string = 'Data'
): Promise<void> {
  try {
    // Transform data based on column definitions
    const transformedData = data.map((row) => {
      const transformedRow: Record<string, any> = {};
      
      columns.forEach((column) => {
        // Get header text
        const header = typeof column.header === 'string' 
          ? column.header 
          : column.id;
        
        // Get cell value using accessor or direct property
        let value: any;
        if (column.accessor) {
          value = column.accessor(row);
        } else {
          value = (row as any)[column.id];
        }
        
        transformedRow[header] = formatValueForCsv(value);
      });
      
      return transformedRow;
    });
    
    const headers = columns.map((column) => typeof column.header === 'string' ? column.header : column.id);
    const lines = [headers.map(csvCell).join(','), ...transformedData.map((row) => headers.map((header) => csvCell(row[header])).join(','))];
    const timestamp = new Date().toISOString().slice(0, 10);
    const fullFilename = `${filename}_${timestamp}.csv`;
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fullFilename;
    anchor.click();
    URL.revokeObjectURL(url);
    
    console.log(`✅ Exported ${data.length} rows to ${fullFilename}`);
  } catch (error) {
    console.error('❌ Export to Excel failed:', error);
    throw new Error('Failed to export data to Excel');
  }
}

/**
 * Format value for Excel cell
 * Handles different data types appropriately
 */
function formatValueForCsv(value: any): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle dates
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  
  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  // Handle objects (stringify)
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Handle React elements (extract text)
  if (typeof value === 'object' && value?.props) {
    return extractTextFromReactElement(value);
  }
  
  // Return as-is for primitives
  return value;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Extract text content from React element
 */
function extractTextFromReactElement(element: any): string {
  if (typeof element === 'string' || typeof element === 'number') {
    return String(element);
  }
  
  if (element?.props?.children) {
    const children = element.props.children;
    if (Array.isArray(children)) {
      return children.map(extractTextFromReactElement).join(' ');
    }
    return extractTextFromReactElement(children);
  }
  
  return '';
}

/**
 * Detect if current locale is RTL
 */
function isRTL(): boolean {
  if (typeof window === 'undefined') return false;
  
  const html = document.documentElement;
  const dir = html.getAttribute('dir');
  const lang = html.getAttribute('lang');
  
  return dir === 'rtl' || lang === 'ar' || lang === 'he' || lang === 'fa';
}

/**
 * Export selected rows only
 */
export async function exportSelectedRows<T = any>(
  data: T[],
  selectedIds: string[],
  getRowId: (row: T, index: number) => string,
  columns: ColumnDef<T>[],
  filename: string = 'export_selected'
): Promise<void> {
  const selectedData = data.filter((row, index) => {
    const id = getRowId(row, index);
    return selectedIds.includes(id);
  });
  
  await exportToExcel(selectedData, columns, filename);
}

/**
 * Export with custom transformer
 */
export async function exportWithTransformer<T = any>(
  data: T[],
  columns: ColumnDef<T>[],
  transformer: (data: T[]) => any[],
  filename: string = 'export'
): Promise<void> {
  const transformedData = transformer(data);
  await exportToExcel(transformedData, columns, filename);
}

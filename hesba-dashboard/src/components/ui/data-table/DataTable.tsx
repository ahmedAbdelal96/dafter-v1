/**
 * DataTable Component
 * 
 * Reusable, feature-rich data table component.
 * 
 * Features:
 * - Generic type support
 * - Customizable columns
 * - Loading, empty, and error states
 * - Pagination
 * - Sorting & filtering
 * - Export to Excel
 * - RTL/LTR support
 * - Dark mode support
 * - Responsive design
 * - Accessibility compliant
 * 
 * @author Senior Development Team
 * @version 1.0.0
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DataTableProps } from './types';
import { DataTableLoading } from './DataTableLoading';
import { DataTableEmpty } from './DataTableEmpty';
import { DataTablePagination } from './DataTablePagination';
import { DataTableExport } from './DataTableExport';
import {
  isRTL,
  getColumnAlignment,
  sortData,
  filterData,
  getSizeClasses,
} from './utils';

/**
 * Main DataTable Component
 * 
 * @example
 * ```tsx
 * <DataTable
 *   data={users}
 *   columns={[
 *     { id: 'name', header: 'Name', accessor: (row) => row.name },
 *     { id: 'email', header: 'Email', accessor: (row) => row.email },
 *   ]}
 *   getRowId={(row) => row.id}
 *   pagination={paginationConfig}
 *   onPageChange={handlePageChange}
 * />
 * ```
 */
export function DataTable<T = any>({
  // Data
  data,
  columns,
  getRowId,
  
  // States
  loading = false,
  error = null,
  emptyState,
  
  // Pagination
  pagination,
  onPageChange,
  
  // Sorting
  sortConfig,
  onSortChange,
  
  // Filtering
  filters,
  onFilterChange,
  
  // Selection
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  
  // Actions
  onRowClick,
  rowActions,
  
  // Export
  exportConfig,
  
  // Styling
  className = '',
  striped = false,
  hoverable = true,
  size = 'md',
  stickyHeader = false,
  maxHeight,
  
  // Accessibility
  ariaLabel,
  caption,
}: DataTableProps<T>) {
  const t = useTranslations('common');
  // Detect RTL
  const rtl = isRTL();
  
  // Get size classes
  const sizeClasses = getSizeClasses(size);
  
  // Local state for uncontrolled features
  const [localSort, setLocalSort] = useState(sortConfig || null);
  const [localFilters, setLocalFilters] = useState(filters || []);
  
  // Use controlled or uncontrolled sort
  const activeSort = sortConfig !== undefined ? sortConfig : localSort;
  const activeFilters = filters !== undefined ? filters : localFilters;
  
  // Process data: filter -> sort
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Apply filters
    if (activeFilters.length > 0) {
      result = filterData(result, activeFilters, columns);
    }
    
    // Apply sort
    if (activeSort) {
      result = sortData(result, activeSort, columns);
    }
    
    return result;
  }, [data, activeFilters, activeSort, columns]);
  
  // Handle sort column click
  const handleSortClick = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    if (!column?.sortable) return;
    
    const newSort = {
      column: columnId,
      direction:
        activeSort?.column === columnId && activeSort.direction === 'asc'
          ? ('desc' as const)
          : ('asc' as const),
    };
    
    if (onSortChange) {
      onSortChange(newSort);
    } else {
      setLocalSort(newSort);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <DataTableLoading
        rows={5}
        columns={columns.length}
        size={size}
      />
    );
  }
  
  // Error state
  if (error) {
    return (
      <DataTableEmpty
        title={t('dataTable.errorTitle')}
        description={
          typeof error === 'string'
            ? error
            : error.message || t('dataTable.tryAgain')
        }
      />
    );
  }
  
  // Empty state
  if (processedData.length === 0) {
    return (
      <DataTableEmpty
        icon={emptyState?.icon}
        title={emptyState?.title || t('dataTable.noData')}
        description={emptyState?.description}
        action={emptyState?.action}
      />
    );
  }
  
  return (
    <div className={`${className}`}>
      {/* Toolbar: Export button */}
      {exportConfig?.enabled && (
        <div className={`mb-4 flex ${rtl ? 'justify-start' : 'justify-end'}`}>
          <DataTableExport
            data={processedData}
            columns={columns}
            config={exportConfig}
          />
        </div>
      )}
      
      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-border-light bg-surface-secondary shadow-theme-xs dark:border-border-strong dark:bg-surface-secondary">
        <div
          className="overflow-x-auto"
          style={{ maxHeight: maxHeight }}
        >
          <table
            className="w-full"
            role="table"
            aria-label={ariaLabel}
          >
            {/* Caption for accessibility */}
            {caption && <caption className="sr-only">{caption}</caption>}
            
            {/* Table Header */}
            <thead
              className={`border-b border-border-strong bg-surface-tertiary ${
                stickyHeader ? 'sticky top-0 z-10' : ''
              }`}
            >
              <tr role="row">
                {/* Selection checkbox column */}
                {selectable && (
                  <th className={`${sizeClasses.header} w-12`} role="columnheader">
                    <input
                      type="checkbox"
                      checked={
                        selectedRows.length > 0 &&
                        selectedRows.length === processedData.length
                      }
                      onChange={(e) => {
                        if (onSelectionChange) {
                          if (e.target.checked) {
                            onSelectionChange(
                              processedData.map((row, index) =>
                                getRowId(row, index)
                              )
                            );
                          } else {
                            onSelectionChange([]);
                          }
                        }
                      }}
                      className="w-4 h-4 text-primary border-border-light rounded focus:ring-primary"
                      aria-label={t('dataTable.selectAll')}
                    />
                  </th>
                )}
                
                {/* Data columns */}
                {columns.map((column) => {
                  const alignment = getColumnAlignment(column, rtl);
                  const isSorted = activeSort?.column === column.id;
                  const sortDirection = activeSort?.direction;
                  
                  return (
                    <th
                      key={column.id}
                      role="columnheader"
                      className={`
                        ${sizeClasses.header}
                        font-medium text-text-secondary uppercase tracking-wider
                        ${column.headerClassName || ''}
                        ${alignment === 'right' ? 'text-right' : alignment === 'center' ? 'text-center' : 'text-left'}
                        ${column.sortable ? 'cursor-pointer select-none hover:bg-surface/50' : ''}
                        ${column.hideOnMobile ? 'hidden md:table-cell' : ''}
                      `}
                      style={{ width: column.width }}
                      onClick={() => column.sortable && handleSortClick(column.id)}
                      aria-sort={
                        isSorted
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span>{column.header}</span>
                        {column.sortable && (
                          <span className="inline-flex flex-col">
                            {isSorted && sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : isSorted && sortDirection === 'desc' ? (
                              <ArrowDown className="w-3 h-3" />
                            ) : (
                              <span className="w-3 h-3 opacity-30">
                                <ArrowUp className="w-3 h-3" />
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                
                {/* Actions column */}
                {rowActions && (
                  <th
                    className={`${sizeClasses.header} ${rtl ? 'text-right' : 'text-left'}`}
                    role="columnheader"
                  >
                    {t('dataTable.actions')}
                  </th>
                )}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="divide-y divide-border-light">
              {processedData.map((row, index) => {
                const rowId = getRowId(row, index);
                const isSelected = selectedRows.includes(rowId);
                
                return (
                  <tr
                    key={rowId}
                    role="row"
                    onClick={() => onRowClick?.(row)}
                    className={`
                      transition-colors
                      ${hoverable ? 'hover:bg-surface-tertiary/50 dark:hover:bg-surface-tertiary' : ''}
                      ${striped && index % 2 === 1 ? 'bg-surface-tertiary/30' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${isSelected ? 'bg-primary/5' : ''}
                    `}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className={sizeClasses.cell} role="cell">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (onSelectionChange) {
                              if (e.target.checked) {
                                onSelectionChange([...selectedRows, rowId]);
                              } else {
                                onSelectionChange(
                                  selectedRows.filter((id) => id !== rowId)
                                );
                              }
                            }
                          }}
                          className="w-4 h-4 text-primary border-border-light rounded focus:ring-primary"
                          aria-label={`${t('dataTable.selectRow')} ${rowId}`}
                        />
                      </td>
                    )}
                    
                    {/* Data cells */}
                    {columns.map((column) => {
                      const alignment = getColumnAlignment(column, rtl);
                      
                      // Get cell value
                      let value: any;
                      if (column.accessor) {
                        value = column.accessor(row);
                      } else {
                        value = (row as any)[column.id];
                      }
                      
                      // Render cell content
                      const cellContent = column.cell
                        ? column.cell(row, value)
                        : value;
                      
                      return (
                        <td
                          key={column.id}
                          role="cell"
                          className={`
                            ${sizeClasses.cell}
                            ${column.className || ''}
                            ${alignment === 'right' ? 'text-right' : alignment === 'center' ? 'text-center' : 'text-left'}
                            ${column.hideOnMobile ? 'hidden md:table-cell' : ''}
                          `}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                    
                    {/* Actions cell */}
                    {rowActions && (
                      <td
                        className={`${sizeClasses.cell} ${rtl ? 'text-right' : 'text-left'}`}
                        role="cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination && onPageChange && (
          <DataTablePagination
            pagination={pagination}
            onPageChange={onPageChange}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

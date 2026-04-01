/**
 * DataTable Loading State Component
 * 
 * Displays a skeleton loading state for the table.
 * Maintains table structure for smooth transitions.
 * 
 * @author Senior Development Team
 */

'use client';

import { getSizeClasses } from './utils';

interface DataTableLoadingProps {
  /** Number of rows to show in skeleton */
  rows?: number;
  
  /** Number of columns */
  columns?: number;
  
  /** Table size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Loading message */
  message?: string;
}

export function DataTableLoading({
  rows = 5,
  columns = 5,
  size = 'md',
  message = 'جاري التحميل...',
}: DataTableLoadingProps) {
  const sizeClasses = getSizeClasses(size);
  
  // Predefined widths to avoid hydration mismatch with Math.random()
  const getSkeletonWidth = (rowIndex: number, colIndex: number) => {
    // Use a deterministic pattern based on row and column indices
    const patterns = [75, 85, 65, 80, 70, 90, 60, 88, 72, 95];
    const index = (rowIndex * columns + colIndex) % patterns.length;
    return patterns[index];
  };
  
  return (
    <div className="bg-surface-secondary rounded-lg border border-border-light overflow-hidden">
      {/* Loading header */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-tertiary border-b border-border-light">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th
                  key={i}
                  className={`${sizeClasses.header} text-start`}
                >
                  <div className="h-4 bg-surface/50 rounded animate-pulse w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className={sizeClasses.cell}>
                    <div
                      className="h-4 bg-surface-tertiary rounded animate-pulse"
                      style={{
                        width: `${getSkeletonWidth(rowIndex, colIndex)}%`,
                        animationDelay: `${rowIndex * 100 + colIndex * 50}ms`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Loading message */}
      {message && (
        <div className="p-8 text-center border-t border-border-light">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
          <p className="text-sm text-text-secondary">{message}</p>
        </div>
      )}
    </div>
  );
}

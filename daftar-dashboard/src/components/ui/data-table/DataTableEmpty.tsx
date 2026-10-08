/**
 * DataTable Empty State Component
 * 
 * Displays when table has no data to show.
 * Supports custom icon, title, description, and action button.
 * 
 * @author Senior Development Team
 */

'use client';

import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface DataTableEmptyProps {
  /** Icon to display (defaults to Inbox) */
  icon?: ReactNode;
  
  /** Title text */
  title: string;
  
  /** Description text */
  description?: string;
  
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function DataTableEmpty({
  icon,
  title,
  description,
  action,
}: DataTableEmptyProps) {
  return (
    <div className="rounded-3xl border border-border-light/90 bg-white/92 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90">
      <div className="p-12 text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-tertiary">
          {icon || <Inbox className="w-8 h-8 text-text-muted" />}
        </div>
        
        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold tracking-tight text-text-primary">
          {title}
        </h3>
        
        {/* Description */}
        {description && (
          <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
            {description}
          </p>
        )}
        
        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="rounded-2xl bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

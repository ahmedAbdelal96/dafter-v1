import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/button/Button";

/**
 * Empty State - Ø­Ø§Ù„Ø© ÙØ§Ø±ØºØ© Ø¹Ø§Ù…Ø©
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
    >
      {/* Icon */}
      {icon && <div className="mb-4">{icon}</div>}

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="mb-6 max-w-sm text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && (
        <Button onClick={action.onClick} className="gap-2">
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * No Data - Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª
 */
interface NoDataProps {
  entity: string; // Ø§Ø³Ù… Ø§Ù„ÙƒÙŠØ§Ù†: "Ø­Ø¬ÙˆØ²Ø§Øª", "Ø¹Ù…Ù„Ø§Ø¡", "Ø®Ø¯Ù…Ø§Øª"
  onAdd?: () => void;
  addLabel?: string;
}

export function NoData({ entity, onAdd, addLabel }: NoDataProps) {
  return (
    <EmptyState
      icon={
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <svg
            className="h-10 w-10 text-gray-400 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      }
      title={`Ù„Ø§ ØªÙˆØ¬Ø¯ ${entity} Ø¨Ø¹Ø¯`}
      description={`Ø§Ø¨Ø¯Ø£ Ø¨Ø¥Ø¶Ø§ÙØ© ${entity} Ø¬Ø¯ÙŠØ¯Ø© Ù„ØªØ¸Ù‡Ø± Ù‡Ù†Ø§`}
      action={
        onAdd
          ? {
              label: addLabel || `Ø¥Ø¶Ø§ÙØ© ${entity}`,
              onClick: onAdd,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

/**
 * No Results - Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ø¨Ø­Ø«
 */
interface NoResultsProps {
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function NoResults({ searchQuery, onClearSearch }: NoResultsProps) {
  return (
    <EmptyState
      icon={
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
          <svg
            className="h-10 w-10 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      }
      title="Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù†ØªØ§Ø¦Ø¬"
      description={
        searchQuery
          ? `Ù„Ù… Ù†ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù†ØªØ§Ø¦Ø¬ ØªØ·Ø§Ø¨Ù‚ "${searchQuery}". Ø¬Ø±Ø¨ Ø§Ù„Ø¨Ø­Ø« Ø¨ÙƒÙ„Ù…Ø§Øª Ù…Ø®ØªÙ„ÙØ©.`
          : "Ø¬Ø±Ø¨ Ø§Ù„Ø¨Ø­Ø« Ø¨ÙƒÙ„Ù…Ø§Øª Ø£Ùˆ ÙÙ„Ø§ØªØ± Ù…Ø®ØªÙ„ÙØ©."
      }
      action={
        onClearSearch
          ? {
              label: "Ù…Ø³Ø­ Ø§Ù„Ø¨Ø­Ø«",
              onClick: onClearSearch,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

/**
 * No Bookings - Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø¬ÙˆØ²Ø§Øª
 */
export function NoBookings({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-10 w-10 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      }
      title="Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø¬ÙˆØ²Ø§Øª"
      description="Ø§Ø¨Ø¯Ø£ Ø¨Ø¥Ø¶Ø§ÙØ© Ø­Ø¬Ø² Ø¬Ø¯ÙŠØ¯ Ù„ØªØ¸Ù‡Ø± Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª Ù‡Ù†Ø§"
      action={
        onAdd
          ? {
              label: "Ø¥Ø¶Ø§ÙØ© Ø­Ø¬Ø²",
              onClick: onAdd,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

/**
 * No Clients - Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¹Ù…Ù„Ø§Ø¡
 */
export function NoClients({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
          <svg
            className="h-10 w-10 text-purple-600 dark:text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
      }
      title="Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¹Ù…Ù„Ø§Ø¡"
      description="Ø£Ø¶Ù Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯ Ù„Ø¨Ø¯Ø¡ Ø¥Ø¯Ø§Ø±Ø© Ù‚Ø§Ø¹Ø¯Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡"
      action={
        onAdd
          ? {
              label: "Ø¥Ø¶Ø§ÙØ© Ø¹Ù…ÙŠÙ„",
              onClick: onAdd,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

/**
 * No Services - Ù„Ø§ ØªÙˆØ¬Ø¯ Ø®Ø¯Ù…Ø§Øª
 */
export function NoServices({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/20">
          <svg
            className="h-10 w-10 text-pink-600 dark:text-pink-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
      }
      title="Ù„Ø§ ØªÙˆØ¬Ø¯ Ø®Ø¯Ù…Ø§Øª"
      description="Ø£Ø¶Ù Ø®Ø¯Ù…Ø§Øª Ø§Ù„ØµØ§Ù„ÙˆÙ† Ø§Ù„Ø®Ø§ØµØ© Ø¨Ùƒ Ù„ØªØªÙ…ÙƒÙ† Ù…Ù† Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª"
      action={
        onAdd
          ? {
              label: "Ø¥Ø¶Ø§ÙØ© Ø®Ø¯Ù…Ø©",
              onClick: onAdd,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

/**
 * No Staff - Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸ÙÙŠÙ†
 */
export function NoStaff({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
          <svg
            className="h-10 w-10 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
      }
      title="Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸ÙÙŠÙ†"
      description="Ø£Ø¶Ù Ù…ÙˆØ¸ÙÙŠ Ø§Ù„ØµØ§Ù„ÙˆÙ† Ù„ØªØªÙ…ÙƒÙ† Ù…Ù† ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ù…Ù‡Ø§Ù… ÙˆØ§Ù„Ø­Ø¬ÙˆØ²Ø§Øª"
      action={
        onAdd
          ? {
              label: "Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ¸Ù",
              onClick: onAdd,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

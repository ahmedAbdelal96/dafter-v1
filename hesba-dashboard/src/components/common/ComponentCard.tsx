import React from "react";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
}) => {
  return (
    <div
      className={`rounded-2xl border border-border-light bg-surface-secondary shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary ${className}`}
    >
      {/* Card Header */}
      <div className="px-6 py-5">
        <h3 className="text-base font-semibold tracking-tight text-text-primary dark:text-white">
          {title}
        </h3>
        {desc && (
          <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">
            {desc}
          </p>
        )}
      </div>

      {/* Card Body */}
      <div className="border-t border-border-light p-4 dark:border-border-strong sm:p-6">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;

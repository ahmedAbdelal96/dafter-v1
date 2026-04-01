import React from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface BadgeProps {
  variant?: BadgeVariant; // Light or solid variant
  size?: BadgeSize; // Badge size
  color?: BadgeColor; // Badge color
  startIcon?: React.ReactNode; // Icon at the start
  endIcon?: React.ReactNode; // Icon at the end
  children: React.ReactNode; // Badge content
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-1 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]";

  // Define size styles
  const sizeStyles = {
    sm: "text-theme-xs", // Smaller padding and font size
    md: "text-sm", // Default padding and font size
  };

  // Define color styles for variants - Using semantic theme classes
  const variants = {
    light: {
      primary:
        "border-primary/12 bg-primary-light text-primary dark:border-primary/20 dark:bg-primary/12 dark:text-primary-active",
      success:
        "border-success-200 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/15 dark:text-success-400",
      error:
        "border-error-200 bg-error-50 text-error-700 dark:border-error-500/20 dark:bg-error-500/15 dark:text-error-400",
      warning:
        "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/15 dark:text-warning-300",
      info: "border-blue-light-200 bg-blue-light-50 text-blue-light-700 dark:border-blue-light-500/20 dark:bg-blue-light-500/15 dark:text-blue-light-300",
      light: "border-border-light bg-surface-tertiary text-text-secondary dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-200",
      dark: "border-slate-300 bg-slate-800 text-white dark:border-slate-600 dark:bg-slate-700 dark:text-white",
    },
    solid: {
      primary: "border-primary bg-primary text-white",
      success: "border-success-600 bg-success-600 text-white dark:text-white",
      error: "border-error-600 bg-error-600 text-white dark:text-white",
      warning: "border-warning-500 bg-warning-500 text-white dark:text-white",
      info: "border-blue-light-600 bg-blue-light-600 text-white dark:text-white",
      light: "border-slate-300 bg-slate-300 text-slate-900 dark:border-white/8 dark:bg-white/10 dark:text-white/80",
      dark: "border-slate-800 bg-slate-800 text-white dark:text-white",
    },
  };

  // Get styles based on size and color variant
  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;

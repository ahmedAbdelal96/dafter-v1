import React, { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode; // Button text or content
  size?: "sm" | "md"; // Button size
  variant?: "primary" | "outline" | "secondary" | "ghost" | "danger"; // Button variant
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  onClick?: () => void; // Click handler
  disabled?: boolean; // Disabled state
  className?: string; // Additional classes
  type?: "button" | "submit" | "reset"; // Button type
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  type = "button",
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  // Variant Classes - Using semantic theme classes
  const variantClasses = {
    primary:
      "bg-primary text-white shadow-theme-sm hover:bg-primary-hover hover:shadow-theme-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:opacity-50",
    outline:
      "bg-surface-secondary text-text-primary ring-1 ring-inset ring-border-light shadow-theme-xs hover:bg-surface hover:ring-border-strong dark:bg-surface-secondary dark:text-text-primary dark:ring-border-strong dark:hover:bg-surface-tertiary",
    secondary:
      "bg-surface-tertiary text-text-primary hover:bg-border-light dark:bg-surface-tertiary dark:text-text-primary dark:hover:bg-border-strong disabled:opacity-50",
    ghost:
      "bg-transparent text-text-secondary hover:bg-surface-secondary hover:text-text-primary dark:text-text-secondary dark:hover:bg-surface-tertiary dark:hover:text-text-primary disabled:opacity-50",
    danger:
      "bg-error-600 text-white shadow-theme-xs hover:bg-error-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-error-500/20 disabled:opacity-50",
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-medium gap-2 rounded-xl transition duration-200 ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;

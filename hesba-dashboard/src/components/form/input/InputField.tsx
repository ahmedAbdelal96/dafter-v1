"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  success?: boolean;
  error?: boolean;
  hint?: string; // Optional hint text
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = "text",
      className = "",
      disabled = false,
      success = false,
      error = false,
      hint,
      onChange,
      onBlur,
      value,
      defaultValue,
      name,
      min,
      max,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const pickerRef = useRef<flatpickr.Instance | null>(null);
    const isDateInput = type === "date";

    useEffect(() => {
      if (!isDateInput || !inputRef.current) return;

      const instance = flatpickr(inputRef.current, {
        static: true,
        monthSelectorType: "static",
        dateFormat: "Y-m-d",
        defaultDate: (value as string) || (defaultValue as string) || undefined,
        minDate: typeof min === "string" ? min : undefined,
        maxDate: typeof max === "string" ? max : undefined,
        onChange: (_, dateStr) => {
          if (!onChange) return;
          onChange({
            target: { value: dateStr, name },
            currentTarget: { value: dateStr, name },
          } as React.ChangeEvent<HTMLInputElement>);
        },
        onClose: () => {
          if (!onBlur) return;
          onBlur({
            target: { value: inputRef.current?.value || "", name },
            currentTarget: { value: inputRef.current?.value || "", name },
          } as React.FocusEvent<HTMLInputElement>);
        },
      });

      pickerRef.current = instance as flatpickr.Instance;

      return () => {
        if (pickerRef.current) {
          pickerRef.current.destroy();
          pickerRef.current = null;
        }
      };
    }, [defaultValue, isDateInput, max, min, name, onBlur, onChange, value]);

    useEffect(() => {
      if (!isDateInput || !pickerRef.current) return;

      const next = typeof value === "string" ? value : "";
      if (!next) {
        pickerRef.current.clear();
        return;
      }

      pickerRef.current.setDate(next, false);
    }, [isDateInput, value]);

    useEffect(() => {
      if (!isDateInput || !pickerRef.current) return;

      pickerRef.current.set("minDate", typeof min === "string" ? min : undefined);
      pickerRef.current.set("maxDate", typeof max === "string" ? max : undefined);
    }, [isDateInput, max, min]);

    // Determine input styles based on state (disabled, success, error)
    let inputClasses = `h-11 w-full rounded-xl border border-border-light px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-text-muted focus:outline-hidden focus:ring-3 dark:border-border-strong dark:bg-surface-secondary dark:text-text-primary dark:placeholder:text-text-muted ${className}`;

    if (!isDateInput) {
      inputClasses += " appearance-none";
    } else {
      inputClasses += " [&::-webkit-calendar-picker-indicator]:cursor-pointer";
    }

    // Add styles for the different states
    if (disabled) {
      inputClasses += ` text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
    } else if (error) {
      inputClasses += ` text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10  dark:text-error-400 dark:border-error-500`;
    } else if (success) {
      inputClasses += ` text-success-500 border-success-400 focus:ring-success-500/10 focus:border-success-300  dark:text-success-400 dark:border-success-500`;
    } else {
      inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-border-focus focus:ring-3 focus:ring-primary/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90`;
    }

    return (
      <div className="relative">
        <input
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          type={isDateInput ? "text" : type}
          disabled={disabled}
          className={inputClasses}
          onChange={isDateInput ? undefined : onChange}
          onBlur={isDateInput ? undefined : onBlur}
          value={isDateInput ? undefined : value}
          defaultValue={isDateInput ? defaultValue : undefined}
          name={name}
          min={min}
          max={max}
          {...props}
        />

        {/* Optional Hint Text */}
        {hint && (
          <p
            className={`mt-1.5 text-xs ${
              error
                ? "text-error-500"
                : success
                  ? "text-success-500"
                  : "text-gray-500"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;

"use client";

import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import Label from './Label';
import { CalenderIcon } from '../../icons';
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;
import Options = flatpickr.Options.Options;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
  options?: Options;
  className?: string;
  error?: string;
  required?: boolean;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  options,
  className,
  error,
  required,
}: PropsType) {
  const fp = useRef<flatpickr.Instance | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const flatPickrInstance = flatpickr(inputRef.current, {
      mode: mode || "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate,
      onChange,
      ...options,
    });

    fp.current = flatPickrInstance as flatpickr.Instance;

    return () => {
      if (fp.current) {
        fp.current.destroy();
        fp.current = null;
      }
    };
  }, [mode, onChange, options]);

  // Keep the component controlled by syncing external value changes.
  useEffect(() => {
    if (!fp.current) return;

    if (
      defaultDate === undefined ||
      defaultDate === null ||
      defaultDate === ""
    ) {
      fp.current.clear();
      return;
    }

    fp.current.setDate(defaultDate, false);
  }, [defaultDate]);

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id}>
          {label} {required && <span className="text-error-600">*</span>}
        </Label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 focus:ring-primary/20 dark:border-gray-700 ${
            error
              ? "border-error-500 focus:border-error-500"
              : "border-gray-300 focus:border-border-focus"
          }`}
          style={{ paddingInlineEnd: "2.75rem", textAlign: "start" }}
        />

        <span
          className="absolute text-gray-500 -translate-y-1/2 pointer-events-none top-1/2 dark:text-gray-400"
          style={{ insetInlineEnd: "0.75rem" }}
        >
          <CalenderIcon className="size-6" />
        </span>
      </div>
       {error && <p className="mt-1 text-sm text-error-500">{error}</p>}
    </div>
  );
}

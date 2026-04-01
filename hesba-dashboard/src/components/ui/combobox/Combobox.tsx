"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import clsx from "clsx";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
}

interface ComboboxProps {
  value?: string;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
  loading?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  onChange: (value?: string) => void;
  onSearchChange?: (value: string) => void;
  className?: string;
}

export default function Combobox({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  loadingText,
  loading = false,
  searchable = true,
  disabled = false,
  onChange,
  onSearchChange,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const normalizedSearch = searchable ? search.trim().toLowerCase() : "";
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return options;

    return options.filter((option) => {
      const byLabel = option.label.toLowerCase().includes(normalizedSearch);
      const byDescription = option.description
        ?.toLowerCase()
        .includes(normalizedSearch);
      const byKeywords = option.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(normalizedSearch),
      );

      return byLabel || byDescription || byKeywords;
    });
  }, [options, normalizedSearch]);

  useEffect(() => {
    if (!open) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
      setSearch("");
      onSearchChange?.("");
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open, onSearchChange]);

  const handleSelect = (nextValue?: string) => {
    onChange(nextValue);
    setOpen(false);
    setSearch("");
    onSearchChange?.("");
  };

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        className={clsx(
          "flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-transparent px-3 text-sm shadow-theme-xs transition",
          "focus:border-border-focus focus:outline-hidden focus:ring-3 focus:ring-primary/10",
          "dark:border-gray-700 dark:bg-gray-900 dark:text-white/90",
          disabled && "cursor-not-allowed opacity-60",
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={clsx("truncate", !selected && "text-gray-400 dark:text-gray-500")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={16} className={clsx("shrink-0 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {searchable ? (
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  const nextSearch = event.target.value;
                  setSearch(nextSearch);
                  onSearchChange?.(nextSearch);
                }}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-9 text-sm focus:border-border-focus focus:outline-hidden focus:ring-2 focus:ring-primary/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          ) : null}

          <div className={clsx("max-h-64 overflow-y-auto", searchable && "mt-2")}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={() => handleSelect(undefined)}
            >
              <span>{placeholder}</span>
              {!value ? <Check size={14} /> : null}
            </button>

            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500">{loadingText}</div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">{emptyText}</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className="flex w-full items-start justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-gray-800 dark:text-gray-100">
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                          {option.description}
                        </span>
                      ) : null}
                    </span>

                    {isSelected ? (
                      <Check size={14} className="mt-0.5 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

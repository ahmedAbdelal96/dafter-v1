"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useState, useRef, useEffect } from "react";

const localeData: Record<string, { name: string; nativeName: string; flag: string }> = {
  ar: { name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  en: { name: "English", nativeName: "English", flag: "🇺🇸" },
};

// Dropdown version for header - matches TailAdmin style
export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as "ar" | "en" });
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLocale = localeData[locale];
  const otherLocale = locale === "ar" ? "en" : "ar";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-2xl border border-border-light/80 bg-white/82 px-3 py-2 text-sm font-medium text-text-primary shadow-theme-xs transition-all hover:bg-white hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
      >
        <span className="text-base">{currentLocale.flag}</span>
        <span className="hidden sm:inline">{currentLocale.nativeName}</span>
        <svg
          className={`h-4 w-4 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full z-50 mt-2 w-40 rounded-2xl border border-border-light/80 bg-white/96 py-1 shadow-theme-lg backdrop-blur-md dark:border-white/8 dark:bg-surface-secondary/96 ltr:right-0 rtl:left-0">
          {Object.entries(localeData).map(([loc, data]) => (
            <button
              key={loc}
              onClick={() => handleChange(loc)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                locale === loc
                  ? "bg-primary-light text-text-primary"
                  : "text-text-secondary dark:text-slate-200"
              }`}
            >
              <span className="text-base">{data.flag}</span>
              <span className="font-medium">{data.nativeName}</span>
              {locale === loc && (
                <svg className="ml-auto h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact toggle button version
export function LanguageSwitcherCompact() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === "ar" ? "en" : "ar";
    router.replace(pathname, { locale: newLocale });
  };

  const otherLocale = localeData[locale === "ar" ? "en" : "ar"];

  return (
    <button
      onClick={toggleLocale}
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border-light/80 bg-white/82 text-text-secondary shadow-theme-xs transition-all hover:bg-white hover:text-text-primary hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
      aria-label={`Switch to ${otherLocale.name}`}
      title={`Switch to ${otherLocale.nativeName}`}
    >
      {/* Globe icon */}
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 21a9 9 0 100-18 9 9 0 000 18z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.6 9h16.8M3.6 15h16.8M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"
        />
      </svg>
      {/* Language badge */}
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
        {locale === "ar" ? "ع" : "En"}
      </span>
    </button>
  );
}

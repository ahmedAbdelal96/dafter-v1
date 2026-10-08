"use client";

import { useTranslations } from "next-intl";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import type { PlatformDashboardPeriodPreset } from "@/lib/api/services/platform-dashboard";

interface PlatformDashboardFiltersProps {
  preset: PlatformDashboardPeriodPreset;
  dateFrom: string;
  dateTo: string;
  onPresetChange: (preset: PlatformDashboardPeriodPreset) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onReset: () => void;
}

const PRESETS: PlatformDashboardPeriodPreset[] = [
  "today",
  "week",
  "month",
  "year",
  "last30days",
];

export function PlatformDashboardFilters({
  preset,
  dateFrom,
  dateTo,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: PlatformDashboardFiltersProps) {
  const t = useTranslations("platformDashboard.filters");

  return (
    <div className="relative z-30 rounded-3xl border border-border-light/90 bg-white/92 p-4 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/88">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((item) => {
            const active = preset === item && !dateFrom && !dateTo;

            return (
              <button
                key={item}
                type="button"
                onClick={() => onPresetChange(item)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-white shadow-theme-sm"
                    : "bg-primary-light text-primary hover:bg-primary/10 dark:bg-white/[0.04] dark:text-slate-200"
                }`}
              >
                {t(`presets.${item}`)}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_180px_auto] md:items-center">
          <DatePicker
            id="platform-dashboard-date-from"
            placeholder={t("dateFrom")}
            defaultDate={dateFrom || undefined}
            onChange={(_, dateStr) => onDateFromChange(dateStr || "")}
            options={{ allowInput: true }}
            className="relative z-40"
          />
          <DatePicker
            id="platform-dashboard-date-to"
            placeholder={t("dateTo")}
            defaultDate={dateTo || undefined}
            onChange={(_, dateStr) => onDateToChange(dateStr || "")}
            options={{ allowInput: true }}
            className="relative z-40"
          />
          <Button variant="outline" onClick={onReset} className="h-11">
            {t("reset")}
          </Button>
        </div>
      </div>
    </div>
  );
}

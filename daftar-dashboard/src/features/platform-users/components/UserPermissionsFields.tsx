"use client";

import { useTranslations } from "next-intl";
import type { UpdateUserPermissionsFormValues } from "../utils/user-schemas";

interface UserPermissionsFieldsProps {
  values: UpdateUserPermissionsFormValues;
  onChange: (key: keyof UpdateUserPermissionsFormValues, value: boolean) => void;
}

const PERMISSION_KEYS: Array<keyof UpdateUserPermissionsFormValues> = [
  "manageUsers",
  "viewParties",
  "manageParties",
  "viewLedger",
  "manageLedger",
  "viewReports",
];

export function UserPermissionsFields({ values, onChange }: UserPermissionsFieldsProps) {
  const t = useTranslations("platformUsers");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("form.permissions")}</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {PERMISSION_KEYS.map((key) => (
          <label
            key={key}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={Boolean(values[key])}
              onChange={(event) => onChange(key, event.target.checked)}
            />
            {t(`permissions.${key}`)}
          </label>
        ))}
      </div>
    </div>
  );
}
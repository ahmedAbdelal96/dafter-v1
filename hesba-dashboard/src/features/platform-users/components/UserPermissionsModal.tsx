"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type { CompanyUser } from "@/lib/api/types/platform";
import {
  updatePermissionsSchema,
  type UpdateUserPermissionsFormValues,
  DEFAULT_STAFF_PERMISSIONS,
} from "../utils/user-schemas";
import { extractUserPermissions } from "../utils/user-format";
import { UserPermissionsFields } from "./UserPermissionsFields";

interface UserPermissionsModalProps {
  open: boolean;
  user: CompanyUser | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: UpdateUserPermissionsFormValues) => Promise<void>;
}

export function UserPermissionsModal({ open, user, loading, onClose, onSubmit }: UserPermissionsModalProps) {
  const t = useTranslations("platformUsers");

  const form = useForm<UpdateUserPermissionsFormValues>({
    resolver: zodResolver(updatePermissionsSchema),
    defaultValues: DEFAULT_STAFF_PERMISSIONS,
  });

  useEffect(() => {
    if (!user) return;
    form.reset(extractUserPermissions(user));
  }, [user, form]);

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-3xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("modal.permissionsTitle")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("modal.permissionsDescription")}</p>

      {!user && loading ? (
        <div className="py-8 text-sm text-gray-500">{t("actions.loading")}</div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <UserPermissionsFields
            values={{
              manageUsers: Boolean(form.watch("manageUsers")),
              viewParties: Boolean(form.watch("viewParties")),
              manageParties: Boolean(form.watch("manageParties")),
              viewLedger: Boolean(form.watch("viewLedger")),
              manageLedger: Boolean(form.watch("manageLedger")),
              viewReports: Boolean(form.watch("viewReports")),
            }}
            onChange={(key, value) => form.setValue(key, value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="danger" onClick={onClose} disabled={loading}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("actions.saving") : t("actions.savePermissions")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

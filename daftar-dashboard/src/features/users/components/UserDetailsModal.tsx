"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type { CompanyUser } from "@/lib/api/types";
import { extractUserPermissions } from "../utils/user-format";
import { useResetUserCredentials } from "@/lib/api/hooks/use-users";

interface UserDetailsModalProps {
  open: boolean;
  user: CompanyUser | null;
  onClose: () => void;
}

export function UserDetailsModal({ open, user, onClose }: UserDetailsModalProps) {
  const t = useTranslations("users");
  const resetMutation = useResetUserCredentials();
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleReset() {
    if (!user) return;
    setResetMessage(null);
    resetMutation.mutate(
      { id: user.id },
      {
        onSuccess: () => {
          setResetMessage({ type: 'success', text: t("messages.resetCredentialsSuccess", { name: user.fullName }) });
        },
        onError: () => {
          setResetMessage({ type: 'error', text: t("messages.resetCredentialsError") });
        },
      },
    );
  }

  const permissions = user ? extractUserPermissions(user) : null;

  function handleClose() {
    setResetMessage(null);
    onClose();
  }

  return (
    <Modal isOpen={open} onClose={handleClose} className="m-4 max-w-3xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("modal.detailsTitle")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("modal.detailsDescription")}</p>

      {user ? (
        <div className="mt-5 space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InfoRow label={t("table.fullName")} value={user.fullName} />
            <InfoRow label={t("table.email")} value={user.email} />
            <InfoRow label={t("table.phone")} value={user.phone || "-"} />
            <InfoRow label={t("table.role")} value={t(`role.${user.role}`)} />
            <InfoRow label={t("table.status")} value={t(`status.${user.status}`)} />
            <InfoRow label={t("details.createdAt")} value={new Date(user.createdAt).toLocaleString()} />
          </div>

          {user.role === "STAFF" && permissions && (
            <div>
              <p className="mb-2 font-medium text-gray-700 dark:text-gray-200">{t("form.permissions")}</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {Object.entries(permissions).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-200">{t(`permissions.${key}`)}: </span>
                    <span className={value ? "text-success-600" : "text-gray-500"}>
                      {value ? t("labels.enabled") : t("labels.disabled")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-sm text-gray-500">{t("actions.loading")}</div>
      )}

      {resetMessage && (
        <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
          resetMessage.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {resetMessage.text}
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {user?.role === "STAFF" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? t("actions.resetCredentialsSending") : t("actions.resetCredentials")}
          </Button>
        )}
        <Button variant="danger" onClick={handleClose}>{t("actions.close")}</Button>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}


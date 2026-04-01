"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import type { CompanyUser } from "@/lib/api/types/platform";
import { resetCredentialsSchema, type ResetCredentialsFormValues } from "../utils/user-schemas";

interface UserResetCredentialsModalProps {
  open: boolean;
  user: CompanyUser | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: ResetCredentialsFormValues) => Promise<void>;
}

export function UserResetCredentialsModal({
  open,
  user,
  loading,
  onClose,
  onSubmit,
}: UserResetCredentialsModalProps) {
  const t = useTranslations("platformUsers");

  const form = useForm<ResetCredentialsFormValues>({
    resolver: zodResolver(resetCredentialsSchema),
    defaultValues: {
      channel: "email",
      reason: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    form.reset({
      channel: user.phone ? "whatsapp" : "email",
      reason: "",
    });
  }, [user, form]);

  const selectedChannel = form.watch("channel");
  const isWhatsappUnavailable = selectedChannel === "whatsapp" && !user?.phone;

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("modal.resetCredentialsTitle")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("modal.resetCredentialsDescription")}</p>

      {!user && loading ? (
        <div className="py-8 text-sm text-gray-500">{t("actions.loading")}</div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="reset-platform-user-channel">{t("form.resetChannel")}</Label>
            <select
              id="reset-platform-user-channel"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              {...form.register("channel")}
            >
              <option value="email">{t("channels.email")}</option>
              <option value="whatsapp">{t("channels.whatsapp")}</option>
            </select>
            {isWhatsappUnavailable && (
              <p className="mt-2 text-xs text-error-600">{t("messages.resetWhatsappUnavailable")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reset-platform-user-reason">{t("form.resetReason")}</Label>
            <textarea
              id="reset-platform-user-reason"
              rows={3}
              placeholder={t("form.resetReasonPlaceholder")}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              {...form.register("reason")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="danger" onClick={onClose} disabled={loading}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading || isWhatsappUnavailable}>
              {loading ? t("actions.saving") : t("actions.resetCredentials")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

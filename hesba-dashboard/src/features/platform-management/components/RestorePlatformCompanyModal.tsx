"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Checkbox from "@/components/form/input/Checkbox";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useRestorePlatformCompany } from "@/lib/api/hooks/use-platform";
import type { PlatformCompanyListItem } from "@/lib/api/services/platform";

interface RestorePlatformCompanyModalProps {
  company: PlatformCompanyListItem | null;
  open: boolean;
  onClose: () => void;
}

export function RestorePlatformCompanyModal({
  company,
  open,
  onClose,
}: RestorePlatformCompanyModalProps) {
  const t = useTranslations("platformManagement.tenants.restoreModal");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const restoreMutation = useRestorePlatformCompany();
  const { handleApiError, showSuccess } = useErrorHandler();

  const isBusy = restoreMutation.isPending;

  const handleClose = () => {
    if (isBusy) return;
    setReason("");
    setConfirmed(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!company || !confirmed) return;
    try {
      await restoreMutation.mutateAsync({
        companyId: company.id,
        payload: { reason: reason.trim() || undefined },
      });
      showSuccess(t("messages.success"));
      handleClose();
    } catch (error) {
      handleApiError(error, t("messages.error"));
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} className="mx-auto w-full max-w-xl p-6 sm:p-8">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success-600">{t("eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">{t("title")}</h2>
          <p className="mt-2 text-sm text-text-secondary dark:text-slate-300">
            {t("description", { companyName: company?.name ?? "-" })}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary dark:text-slate-300">{t("reasonLabel")}</label>
          <TextArea
            rows={4}
            value={reason}
            onChange={setReason}
            placeholder={t("reasonPlaceholder")}
          />
        </div>

        <div className="rounded-xl border border-success-300/70 bg-success-50/80 p-3 dark:border-success-500/30 dark:bg-success-500/10">
          <p className="text-sm text-success-800 dark:text-success-100">{t("warning")}</p>
          <div className="mt-3">
            <Checkbox
              checked={confirmed}
              onChange={setConfirmed}
              label={t("confirmLabel")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>{t("cancel")}</Button>
          <Button variant="primary" disabled={isBusy || !confirmed} onClick={() => void handleSubmit()}>
            {isBusy ? t("submitting") : t("confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


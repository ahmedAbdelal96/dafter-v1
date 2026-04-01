"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useDeletePlatformCompany } from "@/lib/api/hooks/use-platform";
import type { PlatformCompanyListItem } from "@/lib/api/services/platform";

interface DeletePlatformCompanyModalProps {
  company: PlatformCompanyListItem | null;
  open: boolean;
  onClose: () => void;
}

export function DeletePlatformCompanyModal({
  company,
  open,
  onClose,
}: DeletePlatformCompanyModalProps) {
  const t = useTranslations("platformManagement.tenants.deleteModal");
  const [confirmName, setConfirmName] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const deleteMutation = useDeletePlatformCompany();
  const { handleApiError, showSuccess } = useErrorHandler();

  const isBusy = deleteMutation.isPending;
  const normalizedCompanyName = (company?.name ?? "").trim();
  const matchesName = confirmName.trim() === normalizedCompanyName;
  const hasReason = reason.trim().length >= 5;

  const handleClose = () => {
    if (isBusy) return;
    setConfirmName("");
    setReason("");
    setConfirmed(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!company || !matchesName || !confirmed || !hasReason) return;
    try {
      await deleteMutation.mutateAsync({
        companyId: company.id,
        payload: {
          confirmCompanyName: confirmName.trim(),
          reason: reason.trim() || undefined,
        },
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-error-600">{t("eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">{t("title")}</h2>
          <p className="mt-2 text-sm text-text-secondary dark:text-slate-300">{t("description", { companyName: company?.name ?? "-" })}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary dark:text-slate-300">{t("confirmNameLabel")}</label>
          <Input
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            placeholder={t("confirmNamePlaceholder", { companyName: company?.name ?? "" })}
            error={Boolean(confirmName) && !matchesName}
          />
          {!matchesName && confirmName.trim().length > 0 ? (
            <p className="text-xs text-error-600">{t("confirmNameMismatch")}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary dark:text-slate-300">{t("reasonLabel")}</label>
          <TextArea
            rows={4}
            value={reason}
            onChange={setReason}
            placeholder={t("reasonPlaceholder")}
          />
          {!hasReason && reason.trim().length > 0 ? (
            <p className="text-xs text-error-600">{t("reasonMin")}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-error-300/70 bg-error-50/80 p-3 dark:border-error-500/30 dark:bg-error-500/10">
          <p className="text-sm text-error-800 dark:text-error-100">{t("warning")}</p>
          <div className="mt-3">
            <Checkbox
              checked={confirmed}
              onChange={setConfirmed}
              label={t("confirmCheckbox")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>{t("cancel")}</Button>
          <Button
            variant="danger"
            disabled={isBusy || !matchesName || !confirmed || !hasReason}
            onClick={() => void handleSubmit()}
          >
            {isBusy ? t("submitting") : t("confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

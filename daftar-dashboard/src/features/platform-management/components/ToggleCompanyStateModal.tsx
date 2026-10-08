"use client";

import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useDisablePlatformCompany, useEnablePlatformCompany } from "@/lib/api/hooks/use-platform";
import type { PlatformCompanyListItem } from "@/lib/api/services/platform";

interface ToggleCompanyStateModalProps {
  company: PlatformCompanyListItem | null;
  open: boolean;
  onClose: () => void;
}

export function ToggleCompanyStateModal({ company, open, onClose }: ToggleCompanyStateModalProps) {
  const t = useTranslations("platformManagement.tenants.toggleModal");
  const { handleApiError, showSuccess } = useErrorHandler();
  const disableMutation = useDisablePlatformCompany();
  const enableMutation = useEnablePlatformCompany();
  const isBusy = disableMutation.isPending || enableMutation.isPending;
  const isDisableFlow = Boolean(company?.isActive);

  const handleClose = () => {
    if (isBusy) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!company) return;
    try {
      if (isDisableFlow) {
        await disableMutation.mutateAsync(company.id);
        showSuccess(t("messages.disableSuccess"));
      } else {
        await enableMutation.mutateAsync(company.id);
        showSuccess(t("messages.enableSuccess"));
      }
      handleClose();
    } catch (error) {
      handleApiError(error, t("messages.error"));
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} className="mx-auto w-full max-w-xl p-6 sm:p-8">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">
            {isDisableFlow ? t("titles.disable") : t("titles.enable")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary dark:text-slate-300">
            {t(isDisableFlow ? "descriptions.disable" : "descriptions.enable", { companyName: company?.name ?? "-" })}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="danger" onClick={handleClose}>{t("cancel")}</Button>
          <Button variant={isDisableFlow ? "danger" : "primary"} disabled={isBusy} onClick={() => void handleSubmit()}>
            {isBusy ? t("submitting") : t(isDisableFlow ? "confirmDisable" : "confirmEnable")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}



"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useUpdatePlatformCompany } from "@/lib/api/hooks/use-platform";
import type { PlatformCompanyListItem } from "@/lib/api/services/platform";

interface EditPlatformCompanyModalProps {
  company: PlatformCompanyListItem | null;
  open: boolean;
  onClose: () => void;
}

const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

export function EditPlatformCompanyModal({ company, open, onClose }: EditPlatformCompanyModalProps) {
  const t = useTranslations("platformManagement.tenants.editModal");
  const { handleApiError, handleValidationError, showSuccess } = useErrorHandler();
  const updateMutation = useUpdatePlatformCompany();
  const [companyName, setCompanyName] = useState(company?.name ?? "");
  const [companyPhone, setCompanyPhone] = useState(company?.phone ?? "");
  const [companyAddress, setCompanyAddress] = useState(company?.address ?? "");
  const [currencyCode, setCurrencyCode] = useState(company?.currencyCode ?? "EGP");

  const handleClose = () => {
    if (updateMutation.isPending) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!company) return;
    if (!companyName.trim()) {
      handleValidationError(t("errors.companyNameRequired"));
      return;
    }

    const normalizedCurrency = currencyCode.trim().toUpperCase();
    if (normalizedCurrency && !CURRENCY_CODE_REGEX.test(normalizedCurrency)) {
      handleValidationError(t("errors.currencyCodeInvalid"));
      return;
    }

    try {
      await updateMutation.mutateAsync({
        companyId: company.id,
        payload: {
          companyName: companyName.trim(),
          companyPhone: companyPhone.trim() || undefined,
          companyAddress: companyAddress.trim() || undefined,
          currencyCode: normalizedCurrency || undefined,
        },
      });
      showSuccess(t("messages.success"));
      handleClose();
    } catch (error) {
      handleApiError(error, t("messages.error"));
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} className="mx-auto w-full max-w-2xl p-6 sm:p-8">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">{t("title")}</h2>
          <p className="mt-2 text-sm text-text-secondary dark:text-slate-300">{company?.name}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder={t("fields.companyName")} />
          <Input value={companyPhone} onChange={(event) => setCompanyPhone(event.target.value)} placeholder={t("fields.companyPhone")} />
          <Input value={companyAddress} onChange={(event) => setCompanyAddress(event.target.value)} placeholder={t("fields.companyAddress")} />
          <Input value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} placeholder={t("fields.currencyCode")} maxLength={3} />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="danger" onClick={handleClose}>{t("cancel")}</Button>
          <Button variant="primary" disabled={updateMutation.isPending} onClick={() => void handleSubmit()}>
            {updateMutation.isPending ? t("submitting") : t("submit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}



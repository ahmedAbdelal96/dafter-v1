"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type { RecordInstallmentPaymentRequest } from "@/lib/api/types";
import {
  installmentPaymentSchema,
  type InstallmentPaymentFormValues,
} from "../utils/installments-schemas";
import { formatMoney, getRemainingAmount } from "../utils/installments-format";

interface InstallmentPaymentModalProps {
  open: boolean;
  loading: boolean;
  contractId: string;
  scheduleId: string;
  installmentNumber: number;
  amount: string | number;
  paidAmount: string | number;
  onClose: () => void;
  onSubmit: (payload: RecordInstallmentPaymentRequest) => Promise<void>;
}

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export function InstallmentPaymentModal({
  open,
  loading,
  contractId,
  scheduleId,
  installmentNumber,
  amount,
  paidAmount,
  onClose,
  onSubmit,
}: InstallmentPaymentModalProps) {
  const t = useTranslations("installments");
  const locale = useLocale();

  const remaining = getRemainingAmount(amount, paidAmount);

  const form = useForm<InstallmentPaymentFormValues>({
    resolver: zodResolver(installmentPaymentSchema),
    defaultValues: {
      scheduleId,
      amount: remaining,
      paymentDate: todayIsoDate(),
      paymentMethod: "",
      notes: "",
    },
  });

  useEffect(() => {
    form.reset({
      scheduleId,
      amount: remaining,
      paymentDate: todayIsoDate(),
      paymentMethod: "",
      notes: "",
    });
  }, [form, remaining, scheduleId]);

  const handleSubmit = async (values: InstallmentPaymentFormValues) => {
    await onSubmit({
      scheduleId: values.scheduleId,
      amount: Math.min(values.amount, remaining),
      paymentDate: values.paymentDate,
      paymentMethod: values.paymentMethod || undefined,
      notes: values.notes || undefined,
    });
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("paymentModal.title")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {t("paymentModal.description", { contractId, installmentNumber })}
      </p>

      <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="text-gray-600 dark:text-gray-300">
          {t("paymentModal.remaining")}: <span className="font-semibold">{formatMoney(remaining, locale)}</span>
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <input type="hidden" {...form.register("scheduleId")} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="installment-payment-amount">{t("paymentModal.amount")}</Label>
            <Input
              id="installment-payment-amount"
              type="number"
              min={0.01}
              max={remaining}
              step="0.01"
              dir="ltr"
              {...form.register("amount", { setValueAs: (value) => Number(value) })}
            />
          </div>

          <div>
            <Label htmlFor="installment-payment-date">{t("paymentModal.paymentDate")}</Label>
            <Input id="installment-payment-date" type="date" {...form.register("paymentDate")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="installment-payment-method">{t("paymentModal.paymentMethod")}</Label>
            <Input id="installment-payment-method" {...form.register("paymentMethod")} />
          </div>

          <div>
            <Label htmlFor="installment-payment-notes">{t("paymentModal.notes")}</Label>
            <Input id="installment-payment-notes" {...form.register("notes")} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="danger" onClick={onClose} disabled={loading}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t("actions.saving") : t("actions.recordPayment")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


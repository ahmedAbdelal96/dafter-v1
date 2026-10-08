"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type { DeferredSaleRecord, RecordDeferredPaymentRequest } from "@/lib/api/types";
import { formatMoney, toNumber } from "../utils/deferred-sales-format";
import { deferredPaymentSchema, type DeferredPaymentFormValues } from "../utils/deferred-sales-schemas";

interface DeferredSalePaymentModalProps {
  open: boolean;
  loading: boolean;
  sale?: DeferredSaleRecord | null;
  onClose: () => void;
  onSubmit: (payload: RecordDeferredPaymentRequest) => Promise<void>;
}

export function DeferredSalePaymentModal({ open, loading, sale, onClose, onSubmit }: DeferredSalePaymentModalProps) {
  const t = useTranslations("deferred-sales");
  const locale = useLocale();

  const form = useForm<DeferredPaymentFormValues>({
    resolver: zodResolver(deferredPaymentSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "",
      notes: "",
    },
  });

  const handleSubmit = async (values: DeferredPaymentFormValues) => {
    await onSubmit({
      amount: values.amount,
      paymentDate: values.paymentDate,
      paymentMethod: values.paymentMethod || undefined,
      notes: values.notes || undefined,
    });
  };

  const remaining = toNumber(sale?.remaining);

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("paymentModal.title")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("paymentModal.description")}</p>

      {sale && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex justify-between"><span>{t("table.referenceNumber")}</span><span className="font-medium">{sale.referenceNumber}</span></div>
          <div className="mt-1 flex justify-between"><span>{t("table.remaining")}</span><span className="font-medium">{formatMoney(remaining, locale)}</span></div>
        </div>
      )}

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ds-payment-amount">{t("paymentForm.amount")}</Label>
            <Input
              id="ds-payment-amount"
              type="number"
              min={0.01}
              max={remaining > 0 ? remaining : undefined}
              step="0.01"
              dir="ltr"
              {...form.register("amount", { setValueAs: (v) => Number(v) })}
            />
          </div>
          <div>
            <Label htmlFor="ds-payment-date">{t("paymentForm.paymentDate")}</Label>
            <Input id="ds-payment-date" type="date" {...form.register("paymentDate")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ds-payment-method">{t("paymentForm.paymentMethod")}</Label>
            <Input id="ds-payment-method" {...form.register("paymentMethod")} />
          </div>
          <div>
            <Label htmlFor="ds-payment-notes">{t("paymentForm.notes")}</Label>
            <Input id="ds-payment-notes" {...form.register("notes")} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="danger" onClick={onClose} disabled={loading}>{t("actions.cancel")}</Button>
          <Button type="submit" disabled={loading}>{loading ? t("actions.saving") : t("actions.recordPayment")}</Button>
        </div>
      </form>
    </Modal>
  );
}


"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import Button from "@/components/ui/button/Button";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { toAppError } from "@/lib/api/errors";
import {
  useApproveInvoice,
  useCancelInvoice,
  useInvoice,
  useRecordInvoicePayment,
  useRejectInvoice,
  useSubmitInvoice,
} from "@/lib/api/hooks/use-invoices";
import Badge from "@/components/ui/badge/Badge";
import { formatMoney, getInvoiceStatusBadgeColor } from "../utils/invoice-format";

interface InvoiceDetailsPageClientProps {
  invoiceId: string;
}

export function InvoiceDetailsPageClient({ invoiceId }: InvoiceDetailsPageClientProps) {
  const t = useTranslations("invoices");
  const locale = useLocale();
  const { hasPermission, hasRole } = usePermission();
  const { showSuccess, handleApiError } = useErrorHandler();
  const [paymentAmount, setPaymentAmount] = useState("");
  const invoiceQuery = useInvoice(invoiceId, Boolean(invoiceId));
  const submitMutation = useSubmitInvoice();
  const approveMutation = useApproveInvoice();
  const rejectMutation = useRejectInvoice();
  const cancelMutation = useCancelInvoice();
  const recordPaymentMutation = useRecordInvoicePayment();
  const invoice = invoiceQuery.data;

  const canSubmit = hasPermission("invoices:create");
  const canApproveOrReject = hasRole("OWNER");
  const canRecordPayment = hasPermission("ledger:create");
  const canCancel = hasRole("OWNER");

  const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const resolveLifecycleErrorFallback = (error: unknown, action: "submit" | "approve" | "reject" | "cancel") => {
    const appError = toAppError(error);
    const normalizedMessage = appError.message.toLowerCase();

    // Backend currently returns transition failures as 400 with descriptive message text.
    // We map them to stable UI copy per action to avoid leaking raw server wording.
    if (appError.statusCode === 400 && normalizedMessage.includes("cannot")) {
      switch (action) {
        case "submit":
          return t("messages.submitInvalidTransition");
        case "approve":
          return t("messages.approveInvalidTransition");
        case "reject":
          return t("messages.rejectInvalidTransition");
        case "cancel":
          return t("messages.cancelInvalidTransition");
        default:
          return t("messages.lifecycleError");
      }
    }

    return t("messages.lifecycleError");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("details.title")}</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("details.subtitle")}</p>
          </div>

          <Link
            href={`/${locale}/invoices`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={16} />
            {t("details.backToList")}
          </Link>
        </div>
      </section>

      <QueryState
        isLoading={invoiceQuery.isLoading}
        isError={invoiceQuery.isError}
        errorMessage={invoiceQuery.error?.message}
        isEmpty={!invoiceQuery.isLoading && !invoice}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
      >
        {invoice && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge color={getInvoiceStatusBadgeColor(invoice.status)}>
                  {t(`status.${invoice.status}`)}
                </Badge>

                {invoice.status === "DRAFT" && canSubmit ? (
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await submitMutation.mutateAsync(invoice.id);
                        showSuccess(t("messages.submitSuccess"));
                      } catch (error) {
                        handleApiError(error, resolveLifecycleErrorFallback(error, "submit"));
                      }
                    }}
                    disabled={submitMutation.isPending}
                  >
                    {t("actions.submit")}
                  </Button>
                ) : null}

                {invoice.status === "PENDING_APPROVAL" && canApproveOrReject ? (
                  <>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await approveMutation.mutateAsync(invoice.id);
                          showSuccess(t("messages.approveSuccess"));
                        } catch (error) {
                          handleApiError(error, resolveLifecycleErrorFallback(error, "approve"));
                        }
                      }}
                      disabled={approveMutation.isPending}
                    >
                      {t("actions.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await rejectMutation.mutateAsync(invoice.id);
                          showSuccess(t("messages.rejectSuccess"));
                        } catch (error) {
                          handleApiError(error, resolveLifecycleErrorFallback(error, "reject"));
                        }
                      }}
                      disabled={rejectMutation.isPending}
                    >
                      {t("actions.reject")}
                    </Button>
                  </>
                ) : null}

                {invoice.status === "APPROVED" && canCancel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await cancelMutation.mutateAsync(invoice.id);
                        showSuccess(t("messages.cancelSuccess"));
                      } catch (error) {
                        handleApiError(error, resolveLifecycleErrorFallback(error, "cancel"));
                      }
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    {t("actions.cancelInvoice")}
                  </Button>
                ) : null}
              </div>

              {invoice.status === "APPROVED" && canRecordPayment ? (
                <div className="mb-4 flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[220px] flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
                    {t("actions.recordPaymentAmount")}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </label>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const amount = Number(paymentAmount);
                      if (!Number.isFinite(amount) || amount <= 0) {
                        handleApiError(new Error(t("messages.paymentAmountInvalid")));
                        return;
                      }
                      try {
                        await recordPaymentMutation.mutateAsync({
                          id: invoice.id,
                          payload: { amount },
                        });
                        setPaymentAmount("");
                        showSuccess(t("messages.recordPaymentSuccess"));
                      } catch (error) {
                        handleApiError(error, t("messages.lifecycleError"));
                      }
                    }}
                    disabled={recordPaymentMutation.isPending}
                  >
                    {t("actions.recordPayment")}
                  </Button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoItem label={t("table.invoiceNumber")} value={invoice.invoiceNumber} />
                <InfoItem
                  label={t("table.partyType")}
                  value={
                    invoice.partyType === "CUSTOMER"
                      ? t("filters.partyTypeCustomer")
                      : t("filters.partyTypeSupplier")
                  }
                />
                <InfoItem label={t("table.partyName")} value={invoice.partyName} />
                <InfoItem label={t("details.partyPhone")} value={invoice.partyPhone || "-"} />
                <InfoItem label={t("details.partyAddress")} value={invoice.partyAddress || "-"} />
                <InfoItem
                  label={t("table.issueDate")}
                  value={dateFormatter.format(new Date(invoice.issueDate))}
                />
                <InfoItem label={t("table.totalAmount")} value={formatMoney(invoice.totalAmount, locale)} />
                <InfoItem label={t("table.taxAmount")} value={formatMoney(invoice.taxAmount, locale)} />
                <InfoItem label={t("details.grandTotal")} value={formatMoney(invoice.totalAmount, locale)} />
                <InfoItem label={t("table.createdBy")} value={invoice.createdBy?.fullName || "-"} />
                <InfoItem
                  label={t("details.createdAt")}
                  value={dateFormatter.format(new Date(invoice.createdAt))}
                />
                <InfoItem
                  label={t("details.updatedAt")}
                  value={dateFormatter.format(new Date(invoice.updatedAt))}
                />
              </div>
              <div className="mt-4">
                <InfoItem label={t("details.notes")} value={invoice.notes || "-"} />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                {t("details.itemsTitle")}
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800">
                      <th className="px-3 py-3">{t("details.items.description")}</th>
                      <th className="px-3 py-3">{t("details.items.quantity")}</th>
                      <th className="px-3 py-3">{t("details.items.unitPrice")}</th>
                      <th className="px-3 py-3">{t("details.items.total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 last:border-b-0 dark:border-gray-800/70"
                      >
                        <td className="px-3 py-3 text-gray-800 dark:text-gray-100">{item.description}</td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{item.quantity}</td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                          {formatMoney(item.unitPrice, locale)}
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {formatMoney(item.total, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

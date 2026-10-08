"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Ban, HandCoins } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import { QueryState } from "@/components/common/QueryState";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import {
  useCancelInstallmentContract,
  useInstallmentContract,
  useRecordInstallmentPayment,
} from "@/lib/api/hooks/use-installments";
import type {
  InstallmentScheduleRecord,
  RecordInstallmentPaymentRequest,
} from "@/lib/api/types";
import {
  formatDate,
  formatMoney,
  getInstallmentContractStatusColor,
  getInstallmentScheduleStatusColor,
  getRemainingAmount,
} from "../utils/installments-format";
import { InstallmentPaymentModal } from "./InstallmentPaymentModal";

interface InstallmentDetailsPageClientProps {
  contractId: string;
}

type PaymentTarget = {
  scheduleId: string;
  installmentNumber: number;
  amount: string | number;
  paidAmount: string | number;
};

export function InstallmentDetailsPageClient({ contractId }: InstallmentDetailsPageClientProps) {
  const t = useTranslations("installments");
  const locale = useLocale();
  const { hasPermission, hasRole } = usePermission();
  const { handleApiError, showSuccess } = useErrorHandler();

  const canManage = hasPermission("installments:update");
  const canCancel = hasRole("OWNER");

  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

  const detailsQuery = useInstallmentContract(contractId, true, hasPermission("installments:view"));
  const paymentMutation = useRecordInstallmentPayment();
  const cancelMutation = useCancelInstallmentContract();

  const contract = detailsQuery.data;

  const scheduleColumns = useMemo(
    () => [
      {
        id: "installmentNumber",
        header: t("details.schedule.installmentNumber"),
        accessor: (row: InstallmentScheduleRecord) => row.installmentNumber,
      },
      {
        id: "dueDate",
        header: t("details.schedule.dueDate"),
        accessor: (row: InstallmentScheduleRecord) => formatDate(row.dueDate, locale),
      },
      {
        id: "amount",
        header: t("details.schedule.amount"),
        accessor: (row: InstallmentScheduleRecord) => formatMoney(row.amount, locale),
      },
      {
        id: "paidAmount",
        header: t("details.schedule.paidAmount"),
        accessor: (row: InstallmentScheduleRecord) => formatMoney(row.paidAmount, locale),
      },
      {
        id: "remaining",
        header: t("details.schedule.remaining"),
        accessor: (row: InstallmentScheduleRecord) =>
          formatMoney(getRemainingAmount(row.amount, row.paidAmount), locale),
      },
      {
        id: "status",
        header: t("details.schedule.status"),
        accessor: (row: InstallmentScheduleRecord) => row.status,
        cell: (row: InstallmentScheduleRecord) => (
          <Badge color={getInstallmentScheduleStatusColor(row.status)}>
            {t(`scheduleStatus.${row.status}`)}
          </Badge>
        ),
      },
      {
        id: "paidAt",
        header: t("details.schedule.paidAt"),
        accessor: (row: InstallmentScheduleRecord) => formatDate(row.paidAt, locale),
      },
    ],
    [locale, t],
  );

  const handleRecordPayment = async (payload: RecordInstallmentPaymentRequest) => {
    try {
      await paymentMutation.mutateAsync({ id: contractId, payload });
      showSuccess(t("messages.paymentSuccess"));
      setPaymentTarget(null);
    } catch (error) {
      handleApiError(error, t("messages.paymentError"));
    }
  };

  const handleCancelContract = async () => {
    if (!contract) return;

    if (!window.confirm(t("messages.cancelConfirm", { contractNumber: contract.contractNumber }))) {
      return;
    }

    try {
      await cancelMutation.mutateAsync(contract.id);
      showSuccess(t("messages.cancelSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.cancelError"));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("details.title")}</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("details.subtitle")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/installments`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <ArrowLeft size={16} />
              {t("details.backToList")}
            </Link>

            {canCancel && contract?.status === "ACTIVE" && (
              <Button
                variant="outline"
                className="text-error-600"
                startIcon={<Ban size={16} />}
                onClick={() => void handleCancelContract()}
                disabled={cancelMutation.isPending}
              >
                {t("actions.cancelContract")}
              </Button>
            )}
          </div>
        </div>
      </section>

      <QueryState
        isLoading={detailsQuery.isLoading}
        isError={detailsQuery.isError}
        errorMessage={detailsQuery.error?.message}
        isEmpty={!detailsQuery.isLoading && !contract}
        emptyTitle={t("details.empty.title")}
        emptyDescription={t("details.empty.description")}
      >
        {contract && (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2 lg:grid-cols-4">
              <InfoCard label={t("table.contractNumber")} value={contract.contractNumber} />
              <InfoCard label={t("table.partyType")} value={t(`partyType.${contract.partyType}`)} />
              <InfoCard label={t("details.partyName")} value={contract.partyName || "-"} />
              <InfoCard
                label={t("table.status")}
                value={
                  <Badge color={getInstallmentContractStatusColor(contract.status)}>
                    {t(`status.${contract.status}`)}
                  </Badge>
                }
              />
              <InfoCard label={t("table.totalAmount")} value={formatMoney(contract.totalAmount, locale)} />
              <InfoCard label={t("details.downPayment")} value={formatMoney(contract.downPayment, locale)} />
              <InfoCard label={t("table.paidAmount")} value={formatMoney(contract.paidAmount, locale)} />
              <InfoCard
                label={t("details.remaining")}
                value={formatMoney(getRemainingAmount(contract.totalAmount, contract.paidAmount), locale)}
              />
              <InfoCard label={t("table.installmentsCount")} value={String(contract.numberOfInstallments)} />
              <InfoCard label={t("details.scheduleType")} value={t(`scheduleType.${contract.scheduleType}`)} />
              <InfoCard label={t("table.startDate")} value={formatDate(contract.startDate, locale)} />
              <InfoCard label={t("details.createdAt")} value={formatDate(contract.createdAt, locale)} />
              <InfoCard label={t("details.description")} value={contract.description || "-"} />
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("details.schedule.title")}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("details.schedule.subtitle")}</p>

              <div className="mt-4">
                <DataTable<InstallmentScheduleRecord>
                  data={contract.schedules ?? []}
                  columns={scheduleColumns}
                  getRowId={(row) => row.id}
                  rowActions={(row) => {
                    const remaining = getRemainingAmount(row.amount, row.paidAmount);
                    const canPay = canManage && contract.status === "ACTIVE" && remaining > 0;

                    return canPay ? (
                      <button
                        className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                        title={t("actions.recordPayment")}
                        onClick={() =>
                          setPaymentTarget({
                            scheduleId: row.id,
                            installmentNumber: row.installmentNumber,
                            amount: row.amount,
                            paidAmount: row.paidAmount,
                          })
                        }
                      >
                        <HandCoins size={16} />
                      </button>
                    ) : null;
                  }}
                  ariaLabel={t("details.schedule.ariaLabel")}
                />
              </div>
            </section>
          </div>
        )}
      </QueryState>

      {contract && paymentTarget && (
        <InstallmentPaymentModal
          open={Boolean(paymentTarget)}
          loading={paymentMutation.isPending}
          contractId={contract.contractNumber}
          scheduleId={paymentTarget.scheduleId}
          installmentNumber={paymentTarget.installmentNumber}
          amount={paymentTarget.amount}
          paidAmount={paymentTarget.paidAmount}
          onClose={() => setPaymentTarget(null)}
          onSubmit={handleRecordPayment}
        />
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-1 font-medium text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

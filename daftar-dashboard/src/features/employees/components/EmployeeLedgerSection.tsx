"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { QueryState } from "@/components/common/QueryState";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import {
  useCreateLedgerEntry,
  useDeleteLedgerEntry,
  useLedgerStatement,
} from "@/lib/api/hooks/use-ledger";
import type { CreateLedgerEntryRequest } from "@/lib/api/types";
import { formatMoney } from "../utils/employee-format";
import { EmployeeLedgerEntryModal } from "./EmployeeLedgerEntryModal";
import { EmployeeLedgerTable } from "./EmployeeLedgerTable";

interface EmployeeLedgerSectionProps {
  employeeId: string;
}

export function EmployeeLedgerSection({ employeeId }: EmployeeLedgerSectionProps) {
  const t = useTranslations("employees");
  const locale = useLocale();
  const router = useRouter();
  const { hasPermission } = usePermission();
  const { handleApiError, showSuccess } = useErrorHandler();

  const canViewLedger = hasPermission("ledger:view");
  const canCreateLedger = hasPermission("ledger:create");
  const canDeleteLedger = hasPermission("ledger:delete");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filters = useMemo(
    () => ({
      partyType: "EMPLOYEE" as const,
      partyId: employeeId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit,
    }),
    [employeeId, dateFrom, dateTo, page, limit]
  );

  const statementQuery = useLedgerStatement(filters, canViewLedger);
  const createEntryMutation = useCreateLedgerEntry();
  const deleteEntryMutation = useDeleteLedgerEntry();

  const statement = statementQuery.data;
  const limitOptions = useMemo<ComboboxOption[]>(
    () =>
      [10, 20, 50].map((count) => ({
        value: String(count),
        label: String(count),
      })),
    [],
  );

  const handleCreateEntry = async (payload: CreateLedgerEntryRequest) => {
    try {
      await createEntryMutation.mutateAsync(payload);
      showSuccess(t("ledger.messages.createSuccess"));
      setIsCreateModalOpen(false);
    } catch (error) {
      handleApiError(error, t("ledger.messages.createError"));
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm(t("ledger.messages.deleteConfirm"))) {
      return;
    }

    try {
      await deleteEntryMutation.mutateAsync(entryId);
      showSuccess(t("ledger.messages.deleteSuccess"));
    } catch (error) {
      handleApiError(error, t("ledger.messages.deleteError"));
    }
  };

  if (!canViewLedger) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("ledger.title")}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("ledger.noPermission")}</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("ledger.title")}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("ledger.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/${locale}/ledger?partyType=EMPLOYEE&partyId=${employeeId}`)
              }
            >
              {t("ledger.actions.openCentralLedger")}
            </Button>
            {canCreateLedger && (
              <Button startIcon={<Plus size={16} />} onClick={() => setIsCreateModalOpen(true)}>
                {t("ledger.actions.addEntry")}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("ledger.filters.from")}
            </label>
            <DatePicker
              id={`employee-ledger-from-${employeeId}`}
              placeholder={t("ledger.filters.from")}
              defaultDate={dateFrom || undefined}
              onChange={(_, dateStr) => {
                setDateFrom(dateStr || "");
                setPage(1);
              }}
              options={{ allowInput: true }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("ledger.filters.to")}
            </label>
            <DatePicker
              id={`employee-ledger-to-${employeeId}`}
              placeholder={t("ledger.filters.to")}
              defaultDate={dateTo || undefined}
              onChange={(_, dateStr) => {
                setDateTo(dateStr || "");
                setPage(1);
              }}
              options={{ allowInput: true }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("ledger.filters.perPage")}
            </label>
            <Combobox
              value={String(limit)}
              options={limitOptions}
              searchable={false}
              placeholder={String(limit)}
              searchPlaceholder={t("ledger.filters.perPage")}
              onChange={(value) => {
                setLimit(Number(value ?? 10));
                setPage(1);
              }}
            />
          </div>

          <div className="md:col-span-2 md:justify-self-end">
            <button
              className="mt-6 inline-flex h-11 items-center rounded-lg border border-gray-300 px-4 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
              type="button"
            >
              {t("ledger.filters.reset")}
            </button>
          </div>
        </div>
      </section>

      <QueryState
        isLoading={statementQuery.isLoading}
        isError={statementQuery.isError}
        errorMessage={statementQuery.error?.message}
        isEmpty={!statementQuery.isLoading && (statement?.items.length ?? 0) === 0}
        emptyTitle={t("ledger.empty.title")}
        emptyDescription={t("ledger.empty.description")}
      >
        {statement && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard
                label={t("ledger.summary.current")}
                value={formatMoney(statement.currentBalance, locale)}
              />
              <SummaryCard
                label={t("ledger.summary.opening")}
                value={formatMoney(statement.openingBalanceForPeriod, locale)}
              />
              <SummaryCard
                label={t("ledger.summary.closing")}
                value={formatMoney(statement.closingBalanceForPeriod, locale)}
              />
            </section>

            <EmployeeLedgerTable
              statement={statement}
              canDelete={canDeleteLedger}
              deleting={deleteEntryMutation.isPending}
              onDelete={handleDeleteEntry}
              onPageChange={setPage}
            />
          </>
        )}
      </QueryState>

      <EmployeeLedgerEntryModal
        open={isCreateModalOpen}
        loading={createEntryMutation.isPending}
        employeeId={employeeId}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEntry}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

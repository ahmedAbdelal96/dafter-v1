"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { QueryState } from "@/components/common/QueryState";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { API_LIMITS } from "@/lib/api/config";
import { useCustomers } from "@/lib/api/hooks/use-customers";
import { useSuppliers } from "@/lib/api/hooks/use-suppliers";
import { useEmployees } from "@/lib/api/hooks/use-employees";
import { useInvoices } from "@/lib/api/hooks/use-invoices";
import { useDistributePayment, useRecordStandalonePayment } from "@/lib/api/hooks/use-payments";
import type { PartyType } from "@/lib/api/types";

const PARTY_TYPE_OPTIONS: PartyType[] = ["CUSTOMER", "SUPPLIER", "EMPLOYEE"];

export function PaymentsPageClient() {
  const t = useTranslations("payments");
  const locale = useLocale();
  const { showSuccess, handleApiError } = useErrorHandler();
  const [activeFlow, setActiveFlow] = useState<"distribution" | "standalone">("distribution");

  // Shared party selection (used by standalone form + distribute)
  const [selectedPartyType, setSelectedPartyType] = useState<PartyType>("CUSTOMER");
  const [selectedPartyId, setSelectedPartyId] = useState<string | undefined>(undefined);
  const [partySearch, setPartySearch] = useState("");

  // Form fields
  const [standaloneAmount, setStandaloneAmount] = useState("");
  const [distributeAmount, setDistributeAmount] = useState("");
  const [note, setNote] = useState("");

  const debouncedSearch = useDebouncedValue(partySearch, 350);

  // Fetch parties based on type
  const customersQuery = useCustomers(
    { page: 1, limit: API_LIMITS.LOOKUP_LIMIT, search: debouncedSearch || undefined, sortBy: "name", sortOrder: "asc" },
  );
  const suppliersQuery = useSuppliers(
    { page: 1, limit: API_LIMITS.LOOKUP_LIMIT, search: debouncedSearch || undefined, sortBy: "name", sortOrder: "asc" },
  );
  const employeesQuery = useEmployees(
    { page: 1, limit: API_LIMITS.LOOKUP_LIMIT, search: debouncedSearch || undefined, sortBy: "name", sortOrder: "asc" },
  );

  // Open invoices for selected customer (distribute only works with CUSTOMER)
  const invoicesQuery = useInvoices(
    { page: 1, limit: 50, partyType: "CUSTOMER", partyId: selectedPartyId, status: "APPROVED" },
    selectedPartyType === "CUSTOMER" && Boolean(selectedPartyId),
  );

  const standaloneMutation = useRecordStandalonePayment();
  const distributeMutation = useDistributePayment();

  const partyOptions = useMemo<ComboboxOption[]>(() => {
    if (selectedPartyType === "SUPPLIER") {
      return (suppliersQuery.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
    }
    if (selectedPartyType === "EMPLOYEE") {
      return (employeesQuery.data?.items ?? []).map((e) => ({ value: e.id, label: e.name }));
    }
    return (customersQuery.data?.items ?? []).map((c) => ({ value: c.id, label: c.name }));
  }, [selectedPartyType, customersQuery.data?.items, suppliersQuery.data?.items, employeesQuery.data?.items]);

  const partyTypeOptions = useMemo<ComboboxOption[]>(
    () => PARTY_TYPE_OPTIONS.map((pt) => ({ value: pt, label: t(`partyType.${pt}`) })),
    [t],
  );

  const openInvoices = useMemo(
    () => (invoicesQuery.data?.items ?? []).filter((inv) => inv.invoicePaymentStatus !== "PAID"),
    [invoicesQuery.data?.items],
  );
  const distributeAmountValue = Number(distributeAmount);
  const distributeSummary = useMemo(() => {
    const validAmount = Number.isFinite(distributeAmountValue) && distributeAmountValue > 0
      ? distributeAmountValue
      : 0;
    const totalOpenAmount = openInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount) - Number(invoice.paidAmount ?? 0),
      0,
    );
    const allocatedAmount = Math.min(validAmount, Math.max(totalOpenAmount, 0));
    const leftoverAmount = Math.max(validAmount - allocatedAmount, 0);
    const affectedInvoices = validAmount <= 0
      ? 0
      : openInvoices.reduce((count, invoice) => {
          if (count > openInvoices.length) return count;
          const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount ?? 0);
          const covered = openInvoices
            .slice(0, count)
            .reduce((sum, current) => sum + Number(current.totalAmount) - Number(current.paidAmount ?? 0), 0);
          return covered < validAmount && remaining > 0 ? count + 1 : count;
        }, 0);

    return {
      allocatedAmount,
      leftoverAmount,
      affectedInvoices,
    };
  }, [distributeAmountValue, openInvoices]);

  const formatMoney = (value: string | number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));

  const handlePartyTypeChange = (type: PartyType) => {
    setSelectedPartyType(type);
    setSelectedPartyId(undefined);
    setPartySearch("");
  };

  const selectFlow = (flow: "distribution" | "standalone") => {
    setActiveFlow(flow);
    if (flow === "distribution" && selectedPartyType !== "CUSTOMER") {
      setSelectedPartyType("CUSTOMER");
      setSelectedPartyId(undefined);
      setPartySearch("");
    }
  };

  const submitStandalone = async () => {
    const amount = Number(standaloneAmount);
    if (!selectedPartyId || !Number.isFinite(amount) || amount <= 0) {
      handleApiError(new Error(t("errors.invalidStandalonePayload")));
      return;
    }
    try {
      await standaloneMutation.mutateAsync({
        partyType: selectedPartyType,
        partyId: selectedPartyId,
        amount,
        note: note || undefined,
      });
      setStandaloneAmount("");
      setNote("");
      showSuccess(t("messages.standaloneSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.standaloneFailed"));
    }
  };

  const submitDistribute = async () => {
    const amount = Number(distributeAmount);
    if (!selectedPartyId || !Number.isFinite(amount) || amount <= 0) {
      handleApiError(new Error(t("errors.invalidDistributePayload")));
      return;
    }
    try {
      await distributeMutation.mutateAsync({
        customerId: selectedPartyId,
        amount,
        note: note || undefined,
      });
      setDistributeAmount("");
      setNote("");
      showSuccess(
        t("messages.distributeSuccessDetailed", {
          amount: formatMoney(distributeSummary.allocatedAmount),
          count: distributeSummary.affectedInvoices,
        }),
      );
    } catch (error) {
      handleApiError(error, t("messages.distributeFailed"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => selectFlow("distribution")}
          className={`rounded-2xl border p-4 text-start transition ${
            activeFlow === "distribution"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-gray-200 bg-white hover:border-primary/30 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40"
          }`}
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("intent.distributionTitle")}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("intent.distributionDescription")}</p>
        </button>
        <button
          type="button"
          onClick={() => selectFlow("standalone")}
          className={`rounded-2xl border p-4 text-start transition ${
            activeFlow === "standalone"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-gray-200 bg-white hover:border-primary/30 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40"
          }`}
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("intent.standaloneTitle")}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("intent.standaloneDescription")}</p>
        </button>
      </section>

      {/* Party selector */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="party-type">{t("standalone.partyType")}</Label>
            <Combobox
              value={selectedPartyType}
              options={partyTypeOptions}
              searchable={false}
              placeholder={t("standalone.partyType")}
              searchPlaceholder={t("standalone.partyType")}
              onChange={(value) => handlePartyTypeChange((value as PartyType) ?? "CUSTOMER")}
            />
          </div>

          <div>
            <Label htmlFor="party-select">{t(`partyType.${selectedPartyType}`)}</Label>
            <Combobox
              value={selectedPartyId}
              options={partyOptions}
              searchable
              placeholder={t("form.selectCustomer")}
              searchPlaceholder={t("form.customerSearchPlaceholder")}
              emptyText={t("form.selectCustomer")}
              onSearchChange={setPartySearch}
              onChange={(value) => setSelectedPartyId(value ?? undefined)}
            />
          </div>
        </div>
      </section>

      {/* Two-column forms */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Distribute payment */}
        <div className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-900 ${
          activeFlow === "distribution"
            ? "border-primary ring-1 ring-primary/20 dark:border-primary/60"
            : "border-gray-200 dark:border-gray-800"
        }`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("distribute.title")}</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("distribute.helper")}
          </p>
          {selectedPartyType !== "CUSTOMER" ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t("distribute.customerOnly")}
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="distribute-amount">{t("distribute.amount")}</Label>
                <Input
                  id="distribute-amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  dir="ltr"
                  value={distributeAmount}
                  onChange={(e) => setDistributeAmount(e.target.value)}
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-sm dark:border-blue-900/40 dark:bg-blue-950/20">
                <p className="font-medium text-blue-900 dark:text-blue-200">
                  {t("distribute.summaryTitle")}
                </p>
                <div className="mt-2 grid gap-2 text-blue-800 dark:text-blue-300 sm:grid-cols-3">
                  <p>{t("distribute.allocated", { amount: formatMoney(distributeSummary.allocatedAmount) })}</p>
                  <p>{t("distribute.leftover", { amount: formatMoney(distributeSummary.leftoverAmount) })}</p>
                  <p>{t("distribute.affectedInvoices", { count: distributeSummary.affectedInvoices })}</p>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={submitDistribute}
                disabled={distributeMutation.isPending || !selectedPartyId}
              >
                {distributeMutation.isPending ? "..." : t("distribute.submit")}
              </Button>
            </div>
          )}
        </div>

        {/* Standalone payment */}
        <div className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-900 ${
          activeFlow === "standalone"
            ? "border-primary ring-1 ring-primary/20 dark:border-primary/60"
            : "border-gray-200 dark:border-gray-800"
        }`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("standalone.title")}</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("standalone.helper")}</p>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="standalone-amount">{t("standalone.amount")}</Label>
              <Input
                id="standalone-amount"
                type="number"
                min={0.01}
                step="0.01"
                dir="ltr"
                value={standaloneAmount}
                onChange={(e) => setStandaloneAmount(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="standalone-note">{t("form.note")}</Label>
              <textarea
                id="standalone-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="h-auto w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <Button
              className="w-full"
              onClick={submitStandalone}
              disabled={standaloneMutation.isPending || !selectedPartyId}
            >
              {standaloneMutation.isPending ? "..." : t("standalone.submit")}
            </Button>
          </div>
        </div>
      </section>

      {/* Open invoices â€” only shown when a customer is selected */}
      {selectedPartyType === "CUSTOMER" && selectedPartyId && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("openInvoices.title")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("openInvoices.subtitle")}</p>

          <div className="mt-4">
            <QueryState
              isLoading={invoicesQuery.isLoading}
              isError={invoicesQuery.isError}
              errorMessage={invoicesQuery.error?.message}
              errorAction={{
                label: t("messages.retry"),
                onClick: () => {
                  void invoicesQuery.refetch();
                },
              }}
              isEmpty={!invoicesQuery.isLoading && openInvoices.length === 0}
              emptyTitle={t("openInvoices.emptyTitle")}
              emptyDescription={t("openInvoices.emptyDescription")}
              emptyAction={{
                label: t("openInvoices.changeCustomer"),
                onClick: () => {
                  setSelectedPartyId(undefined);
                  setPartySearch("");
                },
              }}
            >
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {openInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {invoice.partyName}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatMoney(invoice.totalAmount)}
                    </p>
                  </div>
                ))}
              </div>
            </QueryState>
          </div>
        </section>
      )}
    </div>
  );
}


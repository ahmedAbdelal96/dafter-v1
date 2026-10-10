"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { QueryState } from "@/components/common/QueryState";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { useBusinessPartners } from "@/lib/api/hooks/use-business-partners";
import {
  useCustomerOpenItems,
  useReconcileCustomer,
  useReconcileSupplier,
  useSupplierOpenItems,
} from "@/lib/api/hooks/use-party-payments";
import type { OpenItem } from "@/lib/api/types/operations";
import { getOpenItemDisplayValues, getOpenItemRemainingAmount, splitOpenItems } from "../utils/runtime-contract";

function toItemOption(item: OpenItem): ComboboxOption {
  const values = getOpenItemDisplayValues(item);
  return {
    value: values.id,
    label: values.reference,
    description: `${values.remainingTransactionAmount} ${values.currencyCode}`,
  };
}

export function OpenItemsPageClient({ mode }: { mode: "ar" | "ap" }) {
  const t = useTranslations("operations.openItems");
  const { handleApiError, showSuccess } = useErrorHandler();
  const { hasPermission } = usePermission();
  const [search, setSearch] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [debitId, setDebitId] = useState("");
  const [creditId, setCreditId] = useState("");
  const [amount, setAmount] = useState("0");

  const partnersQuery = useBusinessPartners({
    page: 1,
    limit: 100,
    search: search || undefined,
    isActive: true,
  });
  const arQuery = useCustomerOpenItems(mode === "ar" ? partnerId : undefined);
  const apQuery = useSupplierOpenItems(mode === "ap" ? partnerId : undefined);
  const reconcileAR = useReconcileCustomer();
  const reconcileAP = useReconcileSupplier();
  const partners = (partnersQuery.data?.items ?? []).filter((partner) =>
    mode === "ar" ? partner.customerProfile : partner.supplierProfile,
  );
  const items = useMemo(
    () => (mode === "ar" ? arQuery.data : apQuery.data) ?? [],
    [apQuery.data, arQuery.data, mode],
  );
  const { debit, credit } = useMemo(() => splitOpenItems(items), [items]);
  const canReconcile = hasPermission(
    mode === "ar" ? "postCustomerPayment" : "reconcileSupplierAP",
  );
  const options = useMemo<ComboboxOption[]>(
    () =>
      partners.map((partner) => ({
        value: partner.id,
        label: `${partner.partnerCode} — ${partner.displayName}`,
      })),
    [partners],
  );
  const debitOptions = useMemo(() => debit.map(toItemOption), [debit]);
  const creditOptions = useMemo(() => credit.map(toItemOption), [credit]);

  const reconcile = async () => {
    if (!debitId || !creditId || Number(amount) <= 0) return;
    try {
      if (mode === "ar") {
        await reconcileAR.mutateAsync({
          debitJournalLineId: debitId,
          creditJournalLineId: creditId,
          amount,
          postingDate: new Date().toISOString(),
        });
      } else {
        await reconcileAP.mutateAsync({
          debitJournalLineId: debitId,
          creditJournalLineId: creditId,
          amount,
          postingDate: new Date().toISOString(),
        });
      }
      showSuccess(t("reconciledSuccess"));
      setAmount("0");
    } catch (error) {
      handleApiError(error, t("reconcileError"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t(mode === "ar" ? "arTitle" : "apTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t("party")}</Label>
            <Combobox
              value={partnerId}
              options={options}
              loading={partnersQuery.isLoading}
              onChange={(value) => {
                setPartnerId(value ?? "");
                setDebitId("");
                setCreditId("");
              }}
              placeholder={t("chooseParty")}
              searchPlaceholder={t("searchParty")}
              emptyText={t("noParties")}
              loadingText={t("loading")}
            />
          </div>
          <div>
            <Label>{t("search")}</Label>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchParty")} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <QueryState
          isLoading={mode === "ar" ? arQuery.isLoading : apQuery.isLoading}
          isError={mode === "ar" ? arQuery.isError : apQuery.isError}
          errorMessage={(mode === "ar" ? arQuery.error : apQuery.error)?.message}
          isEmpty={Boolean(partnerId) && items.length === 0}
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-3 py-3">{t("source")}</th>
                  <th className="px-3 py-3">{t("original")}</th>
                  <th className="px-3 py-3">{t("reconciled")}</th>
                  <th className="px-3 py-3">{t("remaining")}</th>
                  <th className="px-3 py-3">{t("dueDate")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <OpenItemRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </section>

      {canReconcile && partnerId ? (
        <section className="rounded-2xl border border-primary/30 bg-primary-light/20 p-5 dark:bg-primary/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("reconcileTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t("reconcileHint")}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>{t("debitItem")}</Label>
              <Combobox value={debitId} options={debitOptions} onChange={(value) => setDebitId(value ?? "")} placeholder={t("chooseItem")} />
            </div>
            <div>
              <Label>{t("creditItem")}</Label>
              <Combobox value={creditId} options={creditOptions} onChange={(value) => setCreditId(value ?? "")} placeholder={t("chooseItem")} />
            </div>
            <div>
              <Label>{t("amount")}</Label>
              <Input value={amount} onChange={(event) => setAmount(event.target.value)} dir="ltr" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => void reconcile()} disabled={reconcileAR.isPending || reconcileAP.isPending}>
              {t("reconcile")}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function OpenItemRow({ item }: { item: OpenItem }) {
  const values = getOpenItemDisplayValues(item);
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="px-3 py-3">{values.reference}</td>
      <td className="px-3 py-3" dir="ltr">
        {values.originalTransactionAmount} {values.currencyCode}
      </td>
      <td className="px-3 py-3" dir="ltr">
        {values.activeReconciledTransactionAmount} {values.currencyCode}
      </td>
      <td className="px-3 py-3 font-semibold" dir="ltr">
        {getOpenItemRemainingAmount(item)} {values.currencyCode}
      </td>
      <td className="px-3 py-3" dir="ltr">{values.dueDate}</td>
    </tr>
  );
}

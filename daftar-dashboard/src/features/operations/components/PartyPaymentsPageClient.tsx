"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { QueryState } from "@/components/common/QueryState";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { useBusinessPartners } from "@/lib/api/hooks/use-business-partners";
import { useAccountingAccounts } from "@/lib/api/hooks/use-accounting-setup";
import { useCustomerOpenItems, useCustomerPayments, useCreateCustomerPayment, useCreateSupplierPayment, usePostCustomerPayment, usePostSupplierPayment, useReverseCustomerPayment, useReverseSupplierPayment, useSupplierOpenItems, useSupplierPayments, useUpdateCustomerPayment, useUpdateSupplierPayment } from "@/lib/api/hooks/use-party-payments";
import type { PaymentInput, PaymentMethod, PaymentRecord } from "@/lib/api/types/operations";
import { buildPaymentAllocation, canReversePayment, filterPaymentAccounts, getOpenItemRemainingAmount } from "../utils/runtime-contract";

const today = new Date().toISOString().slice(0, 10);
type PartyPaymentMode = "customer" | "supplier";

export function PartyPaymentsPageClient({ mode }: { mode: PartyPaymentMode }) {
  const t = useTranslations("operations.payments");
  const { handleApiError, showSuccess } = useErrorHandler();
  const { hasPermission } = usePermission();
  const [search, setSearch] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState("0");
  const [allocationAmount, setAllocationAmount] = useState("0");
  const [selectedOpenItemId, setSelectedOpenItemId] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const partnerQuery = useBusinessPartners({ page: 1, limit: 100, search: search || undefined, isActive: true });
  const accountsQuery = useAccountingAccounts();
  const isCustomer = mode === "customer";
  const customerPaymentsQuery = useCustomerPayments(undefined, isCustomer);
  const supplierPaymentsQuery = useSupplierPayments(undefined, !isCustomer);
  const customerOpenItemsQuery = useCustomerOpenItems(mode === "customer" ? partnerId : undefined);
  const supplierOpenItemsQuery = useSupplierOpenItems(mode === "supplier" ? partnerId : undefined);
  const createCustomer = useCreateCustomerPayment();
  const createSupplier = useCreateSupplierPayment();
  const postCustomer = usePostCustomerPayment();
  const postSupplier = usePostSupplierPayment();
  const updateCustomer = useUpdateCustomerPayment();
  const updateSupplier = useUpdateSupplierPayment();
  const reverseCustomer = useReverseCustomerPayment();
  const reverseSupplier = useReverseSupplierPayment();
  const partners = (partnerQuery.data?.items ?? []).filter((partner) => isCustomer ? partner.customerProfile : partner.supplierProfile);
  const payments = isCustomer ? customerPaymentsQuery.data ?? [] : supplierPaymentsQuery.data ?? [];
  const openItems = useMemo(
    () => (isCustomer ? customerOpenItemsQuery.data : supplierOpenItemsQuery.data) ?? [],
    [customerOpenItemsQuery.data, isCustomer, supplierOpenItemsQuery.data],
  );
  const accounts = (accountsQuery.data ?? []).filter((account) => account.isActive !== false);
  const canCreate = hasPermission(isCustomer ? "createCustomerPayment" : "createSupplierPayment");
  const canPost = hasPermission(isCustomer ? "postCustomerPayment" : "postSupplierPayment");
  const canEdit = hasPermission(isCustomer ? "editCustomerPayment" : "editSupplierPayment");
  const canReverse = hasPermission(isCustomer ? "postCustomerPayment" : "reverseSupplierPayments");

  const partnerOptions = useMemo<ComboboxOption[]>(() => partners.map((partner) => ({ value: partner.id, label: `${partner.partnerCode} — ${partner.displayName}`, description: partner.email ?? undefined })), [partners]);
  const accountOptions = useMemo<ComboboxOption[]>(() => filterPaymentAccounts(accounts, method).map((account) => ({ value: account.id, label: `${account.code} — ${account.name}`, description: account.accountType })), [accounts, method]);
  const openItemOptions = useMemo<ComboboxOption[]>(() => openItems.map((item) => ({ value: item.id, label: item.documentReference ?? item.sourceType ?? item.id.slice(0, 8), description: `${t("remaining")}: ${getOpenItemRemainingAmount(item)} ${item.currencyCode}` })), [openItems, t]);
  const methodOptions = useMemo<ComboboxOption[]>(() => (["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"] as const).map((value) => ({ value, label: t(`methods.${value}`) })), [t]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!partnerId || !accountId || Number(amount) <= 0) return;
    const selectedItem = openItems.find((item) => item.id === selectedOpenItemId);
    let allocations;
    try {
      allocations = buildPaymentAllocation(amount, selectedItem, allocationAmount);
    } catch (error) {
      handleApiError(error, t("messages.invalidAllocation"));
      return;
    }
    const payload: PaymentInput = {
      businessPartnerId: partnerId,
      paymentDate,
      method,
      transactionCurrencyCode: currency.toUpperCase(),
      exchangeRate,
      amount,
      allocations,
      ...(isCustomer ? { destinationAccountId: accountId } : { sourceAccountId: accountId }),
    };
    try {
      if (editingPaymentId) {
        if (isCustomer) await updateCustomer.mutateAsync({ id: editingPaymentId, payload });
        else await updateSupplier.mutateAsync({ id: editingPaymentId, payload });
        showSuccess(t("messages.updated"));
      } else if (isCustomer) {
        await createCustomer.mutateAsync(payload);
        showSuccess(t("messages.created"));
      } else {
        await createSupplier.mutateAsync(payload);
        showSuccess(t("messages.created"));
      }
      setEditingPaymentId(null);
      setAmount("0");
      setAllocationAmount("0");
      setSelectedOpenItemId("");
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const edit = (payment: PaymentRecord) => {
    if (payment.status !== "DRAFT") return;
    setEditingPaymentId(payment.id);
    setPartnerId(payment.businessPartnerId);
    setPaymentDate(payment.paymentDate.slice(0, 10));
    setMethod(payment.method);
    setAmount(payment.amount);
    setAllocationAmount(payment.allocations?.[0]?.amount ?? "0");
    setCurrency(payment.transactionCurrencyCode);
    setExchangeRate(payment.exchangeRate);
    setSelectedOpenItemId(payment.allocations?.[0]?.journalLineId ?? "");
  };

  const reverse = async (id: string) => {
    if (!window.confirm(t("messages.reverseConfirm"))) return;
    const reason = window.prompt(t("messages.reverseReason"))?.trim();
    if (!reason) return;
    try {
      if (isCustomer) await reverseCustomer.mutateAsync({ id, postingDate: today, reason });
      else await reverseSupplier.mutateAsync({ id, postingDate: today, reason });
      showSuccess(t("messages.reversed"));
    } catch (error) {
      handleApiError(error, t("messages.reverseError"));
    }
  };

  const post = async (id: string) => {
    if (!window.confirm(t("messages.postConfirm"))) return;
    try {
      if (isCustomer) await postCustomer.mutateAsync({ id, postingDate: today });
      else await postSupplier.mutateAsync({ id, postingDate: today });
      showSuccess(t("messages.posted"));
    } catch (error) {
      handleApiError(error, t("messages.postError"));
    }
  };

  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t(isCustomer ? "customerTitle" : "supplierTitle")}</h1><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t(isCustomer ? "customerSubtitle" : "supplierSubtitle")}</p></div>
    {canCreate ? <form onSubmit={create} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{editingPaymentId ? t("edit") : t("createTitle")}</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div className="lg:col-span-2"><Label>{t(isCustomer ? "customer" : "supplier")}</Label><Combobox value={partnerId} options={partnerOptions} loading={partnerQuery.isLoading} onChange={(value) => { setPartnerId(value ?? ""); setSelectedOpenItemId(""); setAllocationAmount("0"); }} placeholder={t(isCustomer ? "chooseCustomer" : "chooseSupplier")} searchPlaceholder={t("searchParty")} emptyText={t("noParties")} loadingText={t("loading")} /></div><div><Label>{t("date")}</Label><Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div><div><Label>{t("amount")}</Label><Input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" dir="ltr" /></div><div><Label>{t("method")}</Label><Combobox value={method} options={methodOptions} searchable={false} onChange={(value) => { setMethod((value ?? "BANK_TRANSFER") as PaymentMethod); setAccountId(""); }} placeholder={t("chooseMethod")} /></div><div><Label>{t("account")}</Label><Combobox value={accountId} options={accountOptions} loading={accountsQuery.isLoading} onChange={(value) => setAccountId(value ?? "")} placeholder={t("chooseAccount")} searchPlaceholder={t("searchAccount")} emptyText={t("noAccounts")} loadingText={t("loading")} /></div><div><Label>{t("currency")}</Label><Input value={currency} onChange={(event) => setCurrency(event.target.value)} maxLength={3} dir="ltr" /></div><div><Label>{t("exchangeRate")}</Label><Input value={exchangeRate} onChange={(event) => setExchangeRate(event.target.value)} dir="ltr" /></div><div className="lg:col-span-2"><Label>{t("allocation")}</Label><Combobox value={selectedOpenItemId} options={openItemOptions} loading={Boolean(partnerId) && (isCustomer ? customerOpenItemsQuery.isLoading : supplierOpenItemsQuery.isLoading)} onChange={(value) => { setSelectedOpenItemId(value ?? ""); setAllocationAmount(value ? amount : "0"); }} placeholder={t("onAccount")} searchPlaceholder={t("searchOpenItems")} emptyText={t("noOpenItems")} loadingText={t("loading")} /></div>{selectedOpenItemId ? <div><Label>{t("allocationAmount")}</Label><Input value={allocationAmount} onChange={(event) => setAllocationAmount(event.target.value)} inputMode="decimal" dir="ltr" /></div> : null}</div><p className="mt-3 text-xs text-gray-500">{t("accountNote")}</p><div className="mt-5 flex justify-end"><Button type="submit" disabled={createCustomer.isPending || createSupplier.isPending || updateCustomer.isPending || updateSupplier.isPending}>{editingPaymentId ? t("edit") : t("saveDraft")}</Button></div></form> : null}
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("listTitle")}</h2><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchParty")} className="max-w-xs" /></div><QueryState isLoading={isCustomer ? customerPaymentsQuery.isLoading : supplierPaymentsQuery.isLoading} isError={isCustomer ? customerPaymentsQuery.isError : supplierPaymentsQuery.isError} errorMessage={(isCustomer ? customerPaymentsQuery.error : supplierPaymentsQuery.error)?.message} isEmpty={payments.length === 0} emptyTitle={t("emptyTitle")} emptyDescription={t("emptyDescription")}><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400"><th className="px-3 py-3">{t("party")}</th><th className="px-3 py-3">{t("date")}</th><th className="px-3 py-3">{t("amount")}</th><th className="px-3 py-3">{t("status")}</th><th className="px-3 py-3">{t("actions")}</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800"><td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{payment.businessPartner?.displayName ?? payment.businessPartnerId}</td><td className="px-3 py-3" dir="ltr">{payment.paymentDate.slice(0, 10)}</td><td className="px-3 py-3" dir="ltr">{payment.amount} {payment.transactionCurrencyCode}</td><td className="px-3 py-3">{t(`status.${payment.status}`)}</td><td className="flex flex-wrap gap-2 px-3 py-3">{payment.status === "DRAFT" && canEdit ? <Button size="sm" onClick={() => edit(payment)}>{t("edit")}</Button> : null}{payment.status === "DRAFT" && canPost ? <Button size="sm" onClick={() => void post(payment.id)}>{t("post")}</Button> : null}{canReversePayment(mode, payment, { postCustomerPayment: canPost, reverseSupplierPayments: canReverse }) ? <Button size="sm" onClick={() => void reverse(payment.id)}>{t("reverse")}</Button> : null}</td></tr>)}</tbody></table></div></QueryState></section>
  </div>;
}

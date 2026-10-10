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
import { useCreateSalesInvoice, useDeleteSalesInvoice, usePostSalesInvoice, useSalesInvoice, useSalesInvoices } from "@/lib/api/hooks/use-operational-documents";
import { useTaxRates } from "@/lib/api/hooks/use-tax-setup";
import type { SalesInvoiceInput, SalesInvoiceLineInput } from "@/lib/api/types/operations";

const today = new Date().toISOString().slice(0, 10);

function newLine(): SalesInvoiceLineInput {
  return { description: "", quantity: "1", unitPrice: "0", discountType: "NONE", discountValue: "0" };
}

function formatAmount(value: string | number | undefined, currency = "EGP") {
  return new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

export function SalesInvoicesPageClient() {
  const t = useTranslations("operations.sales");
  const { handleApiError, showSuccess } = useErrorHandler();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("createSalesInvoice");
  const canPost = hasPermission("postSalesInvoice");
  const canEdit = hasPermission("editSalesInvoice");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<SalesInvoiceInput>({ businessPartnerId: "", documentDate: today, currencyCode: "EGP", exchangeRate: "1", lines: [newLine()] });

  const partnersQuery = useBusinessPartners({ page: 1, limit: 100, search: search || undefined, isActive: true });
  const invoicesQuery = useSalesInvoices({ page: 1, limit: 100, search: search || undefined });
  const selectedQuery = useSalesInvoice(selectedId, Boolean(selectedId));
  const taxRatesQuery = useTaxRates({ activeOnly: true, limit: 100 });
  const createMutation = useCreateSalesInvoice();
  const postMutation = usePostSalesInvoice();
  const deleteMutation = useDeleteSalesInvoice();
  const partners = (partnersQuery.data?.items ?? []).filter((partner) => partner.customerProfile?.isActive !== false && partner.customerProfile);
  const invoices = invoicesQuery.data?.items ?? [];
  const selected = selectedQuery.data;

  const partnerOptions = useMemo<ComboboxOption[]>(() => partners.map((partner) => ({ value: partner.id, label: `${partner.partnerCode} — ${partner.displayName}`, description: partner.email ?? undefined })), [partners]);
  const taxOptions = useMemo<ComboboxOption[]>(() => (taxRatesQuery.data?.items ?? []).map((rate) => ({ value: rate.id, label: `${rate.code} — ${rate.name}`, description: `${rate.percentage}%` })), [taxRatesQuery.data?.items]);

  const resetForm = () => setForm({ businessPartnerId: "", documentDate: today, currencyCode: "EGP", exchangeRate: "1", lines: [newLine()] });
  const setLine = (index: number, key: keyof SalesInvoiceLineInput, value: string) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) }));

  const createDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.businessPartnerId || form.lines.some((line) => !line.description.trim() || !line.quantity || !line.unitPrice)) return;
    try {
      const result = await createMutation.mutateAsync({ ...form, lines: form.lines.map((line) => ({ ...line, description: line.description.trim() })) });
      setSelectedId(result.id);
      resetForm();
      showSuccess(t("messages.created"));
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const post = async (id: string) => {
    if (!window.confirm(t("messages.postConfirm"))) return;
    try {
      await postMutation.mutateAsync({ id, postingDate: today });
      showSuccess(t("messages.posted"));
    } catch (error) {
      handleApiError(error, t("messages.postError"));
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("messages.deleteConfirm"))) return;
    try {
      await deleteMutation.mutateAsync(id);
      if (selectedId === id) setSelectedId("");
      showSuccess(t("messages.deleted"));
    } catch (error) {
      handleApiError(error, t("messages.deleteError"));
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t("title")}</h1><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p></div>
      {canCreate ? <form onSubmit={createDraft} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("createTitle")}</h2><span className="text-xs text-gray-500">{t("draftHint")}</span></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2"><Label>{t("customer")}</Label><Combobox value={form.businessPartnerId} options={partnerOptions} loading={partnersQuery.isLoading} onChange={(value) => setForm((current) => ({ ...current, businessPartnerId: value ?? "" }))} placeholder={t("chooseCustomer")} searchPlaceholder={t("searchCustomer")} emptyText={t("noCustomers")} loadingText={t("loading")} /></div>
          <div><Label>{t("documentDate")}</Label><Input type="date" value={form.documentDate} onChange={(event) => setForm((current) => ({ ...current, documentDate: event.target.value }))} /></div>
          <div><Label>{t("currency")}</Label><Input value={form.currencyCode ?? "EGP"} maxLength={3} onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} dir="ltr" /></div>
          <div><Label>{t("exchangeRate")}</Label><Input value={form.exchangeRate} onChange={(event) => setForm((current) => ({ ...current, exchangeRate: event.target.value }))} inputMode="decimal" dir="ltr" /></div>
          <div className="lg:col-span-3"><Label>{t("reference")}</Label><Input value={form.customerReference ?? ""} onChange={(event) => setForm((current) => ({ ...current, customerReference: event.target.value }))} /></div>
        </div>
        <div className="mt-5 space-y-3"><div className="flex items-center justify-between"><h3 className="font-medium text-gray-900 dark:text-white">{t("lines")}</h3><Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, newLine()] }))}>{t("addLine")}</Button></div>
          {form.lines.map((line, index) => <div key={`line-${index}`} className="grid gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800 md:grid-cols-12"><div className="md:col-span-4"><Label>{t("description")}</Label><Input value={line.description} onChange={(event) => setLine(index, "description", event.target.value)} /></div><div className="md:col-span-2"><Label>{t("quantity")}</Label><Input value={line.quantity} onChange={(event) => setLine(index, "quantity", event.target.value)} inputMode="decimal" dir="ltr" /></div><div className="md:col-span-2"><Label>{t("unitPrice")}</Label><Input value={line.unitPrice} onChange={(event) => setLine(index, "unitPrice", event.target.value)} inputMode="decimal" dir="ltr" /></div><div className="md:col-span-3"><Label>{t("tax")}</Label><Combobox value={line.taxRateId} options={taxOptions} loading={taxRatesQuery.isLoading} onChange={(value) => setLine(index, "taxRateId", value ?? "")} placeholder={t("noTax")} emptyText={t("noTaxRates")} loadingText={t("loading")} /></div><div className="flex items-end md:col-span-1">{form.lines.length > 1 ? <Button type="button" size="sm" variant="ghost" onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))}>×</Button> : null}</div></div>)}
        </div>
        <div className="mt-5 flex justify-end"><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? t("saving") : t("createDraft")}</Button></div>
      </form> : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("listTitle")}</h2><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} className="sm:max-w-xs" /></div>
        <QueryState isLoading={invoicesQuery.isLoading} isError={invoicesQuery.isError} errorMessage={invoicesQuery.error?.message} errorAction={{ label: t("retry"), onClick: () => void invoicesQuery.refetch() }} isEmpty={!invoicesQuery.isLoading && invoices.length === 0} emptyTitle={t("emptyTitle")} emptyDescription={t("emptyDescription")}>
          <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400"><th className="px-3 py-3">{t("number")}</th><th className="px-3 py-3">{t("customer")}</th><th className="px-3 py-3">{t("date")}</th><th className="px-3 py-3">{t("amount")}</th><th className="px-3 py-3">{t("status")}</th><th className="px-3 py-3">{t("actions")}</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-b border-gray-100 dark:border-gray-800"><td className="px-3 py-3 font-mono text-xs" dir="ltr">{invoice.invoiceNumber ?? invoice.id.slice(0, 8)}</td><td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{invoice.businessPartner?.displayName ?? invoice.businessPartnerId}</td><td className="px-3 py-3" dir="ltr">{invoice.documentDate.slice(0, 10)}</td><td className="px-3 py-3" dir="ltr">{formatAmount(invoice.grandTotal, invoice.currencyCode)}</td><td className="px-3 py-3"><span className={invoice.status === "POSTED" ? "text-success-600" : "text-warning-600"}>{t(`status.${invoice.status}`)}</span></td><td className="px-3 py-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => setSelectedId(invoice.id)}>{t("view")}</Button>{invoice.status === "DRAFT" && canPost ? <Button size="sm" onClick={() => void post(invoice.id)} disabled={postMutation.isPending}>{t("post")}</Button> : null}{invoice.status === "DRAFT" && canEdit ? <Button size="sm" variant="danger" onClick={() => void remove(invoice.id)} disabled={deleteMutation.isPending}>{t("delete")}</Button> : null}</div></td></tr>)}</tbody></table></div>
        </QueryState>
      </section>

      {selected ? <section className="rounded-2xl border border-primary/30 bg-primary-light/20 p-5 dark:bg-primary/10"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.invoiceNumber ?? selected.id}</h2><p className="text-sm text-gray-600 dark:text-gray-300">{selected.businessPartner?.displayName ?? selected.businessPartnerId} · {t(`status.${selected.status}`)}</p></div><Button size="sm" variant="ghost" onClick={() => setSelectedId("")}>×</Button></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div><span className="text-xs text-gray-500">{t("subtotal")}</span><p className="font-semibold" dir="ltr">{formatAmount(selected.subtotal, selected.currencyCode)}</p></div><div><span className="text-xs text-gray-500">{t("taxTotal")}</span><p className="font-semibold" dir="ltr">{formatAmount(selected.taxTotal, selected.currencyCode)}</p></div><div><span className="text-xs text-gray-500">{t("grandTotal")}</span><p className="font-semibold" dir="ltr">{formatAmount(selected.grandTotal, selected.currencyCode)}</p></div></div><p className="mt-4 text-xs text-gray-500">{selected.status === "POSTED" ? t("postedReadOnly") : t("draftEditable")}</p></section> : null}
    </div>
  );
}

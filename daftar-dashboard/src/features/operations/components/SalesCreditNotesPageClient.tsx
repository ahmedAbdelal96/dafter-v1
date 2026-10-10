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
import { useCreateSalesCreditNote, usePostSalesCreditNote, useSalesCreditNotes, useSalesInvoice, useSalesInvoices } from "@/lib/api/hooks/use-operational-documents";
import type { SalesCreditNoteInput } from "@/lib/api/types/operations";

const today = new Date().toISOString().slice(0, 10);

export function SalesCreditNotesPageClient() {
  const t = useTranslations("operations.creditNotes");
  const { handleApiError, showSuccess } = useErrorHandler();
  const { hasPermission } = usePermission();
  const [invoiceId, setInvoiceId] = useState("");
  const [documentDate, setDocumentDate] = useState(today);
  const [reason, setReason] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [creditAllLines, setCreditAllLines] = useState(false);
  const invoicesQuery = useSalesInvoices({ page: 1, limit: 100, status: "POSTED" });
  const notesQuery = useSalesCreditNotes();
  const invoiceQuery = useSalesInvoice(invoiceId, Boolean(invoiceId));
  const createMutation = useCreateSalesCreditNote();
  const postMutation = usePostSalesCreditNote();
  const canCreate = hasPermission("createSalesCreditNote");
  const canPost = hasPermission("postSalesCreditNote");
  const postedInvoices = useMemo(() => invoicesQuery.data?.items ?? [], [invoicesQuery.data?.items]);
  const lines = invoiceQuery.data?.lines ?? [];
  const notes = notesQuery.data?.items ?? [];
  const invoiceOptions = useMemo<ComboboxOption[]>(() => postedInvoices.map((invoice) => ({ value: invoice.id, label: `${invoice.invoiceNumber ?? invoice.id.slice(0, 8)} — ${invoice.businessPartner?.displayName ?? invoice.businessPartnerId}` })), [postedInvoices]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const originalLine = lines[0];
    if (!invoiceId || !originalLine?.id || !reason.trim()) return;
    const creditLines = creditAllLines
      ? lines.map((line) => ({ originalSalesInvoiceLineId: line.id, quantity: line.quantity }))
      : [{ originalSalesInvoiceLineId: originalLine.id, quantity }];
    const payload: SalesCreditNoteInput = { salesInvoiceId: invoiceId, documentDate, reason: reason.trim(), lines: creditLines };
    try { await createMutation.mutateAsync(payload); setReason(""); showSuccess(t("messages.created")); } catch (error) { handleApiError(error, t("messages.createError")); }
  };

  const post = async (id: string) => {
    if (!window.confirm(t("messages.postConfirm"))) return;
    try { await postMutation.mutateAsync({ id, postingDate: today }); showSuccess(t("messages.posted")); } catch (error) { handleApiError(error, t("messages.postError")); }
  };

  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t("title")}</h1><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p></div>{canCreate ? <form onSubmit={create} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("createTitle")}</h2><div className="grid gap-4 md:grid-cols-3"><div className="md:col-span-2"><Label>{t("originalInvoice")}</Label><Combobox value={invoiceId} options={invoiceOptions} loading={invoicesQuery.isLoading} onChange={(value) => setInvoiceId(value ?? "")} placeholder={t("chooseInvoice")} emptyText={t("noInvoices")} loadingText={t("loading")} /></div><div><Label>{t("documentDate")}</Label><Input type="date" value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} /></div><div><Label>{t("reason")}</Label><Input value={reason} onChange={(event) => setReason(event.target.value)} /></div><div><Label>{t("quantity")}</Label><Input value={quantity} onChange={(event) => setQuantity(event.target.value)} dir="ltr" /></div><label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 md:col-span-2"><input type="checkbox" checked={creditAllLines} onChange={(event) => setCreditAllLines(event.target.checked)} />{t("creditAllLines")}</label></div><p className="mt-3 text-xs text-gray-500">{invoiceQuery.data ? `${t("sourceLine")}: ${lines[0]?.description ?? "-"}` : t("selectInvoiceHint")}</p><div className="mt-5 flex justify-end"><Button type="submit" disabled={createMutation.isPending}>{t("createDraft")}</Button></div></form> : null}<section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("listTitle")}</h2><QueryState isLoading={notesQuery.isLoading} isError={notesQuery.isError} errorMessage={notesQuery.error?.message} isEmpty={notes.length === 0} emptyTitle={t("emptyTitle")} emptyDescription={t("emptyDescription")}><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400"><th className="px-3 py-3">{t("number")}</th><th className="px-3 py-3">{t("reason")}</th><th className="px-3 py-3">{t("amount")}</th><th className="px-3 py-3">{t("status")}</th><th className="px-3 py-3">{t("actions")}</th></tr></thead><tbody>{notes.map((note) => <tr key={note.id} className="border-b border-gray-100 dark:border-gray-800"><td className="px-3 py-3 font-mono text-xs" dir="ltr">{note.creditNoteNumber ?? note.id.slice(0, 8)}</td><td className="px-3 py-3">{note.reason}</td><td className="px-3 py-3" dir="ltr">{note.grandTotal} {invoiceQuery.data?.currencyCode ?? ""}</td><td className="px-3 py-3">{t(`status.${note.status}`)}</td><td className="px-3 py-3">{note.status === "DRAFT" && canPost ? <Button size="sm" onClick={() => void post(note.id)}>{t("post")}</Button> : null}</td></tr>)}</tbody></table></div></QueryState></section></div>;
}

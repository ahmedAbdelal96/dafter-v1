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
import { useApprovePurchaseOrder, useConvertPurchaseOrder, useCreatePurchaseOrder, useCreateSupplierInvoice, usePostSupplierInvoice, usePurchaseOrders, useSupplierInvoices } from "@/lib/api/hooks/use-operational-documents";
import type { PurchaseDocumentInput, PurchaseLineInput } from "@/lib/api/types/operations";

const today = new Date().toISOString().slice(0, 10);

function blankLine(): PurchaseLineInput { return { description: "", quantity: "1", unitPrice: "0", discountType: "NONE", discountValue: "0" }; }

type PurchaseMode = "orders" | "supplierInvoices";

export function PurchasesPageClient({ mode }: { mode: PurchaseMode }) {
  const t = useTranslations("operations.purchases");
  const { handleApiError, showSuccess } = useErrorHandler();
  const { hasPermission } = usePermission();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<PurchaseDocumentInput>({ businessPartnerId: "", documentDate: today, currencyCode: "EGP", exchangeRate: "1", lines: [blankLine()] });
  const partnerQuery = useBusinessPartners({ page: 1, limit: 100, search: search || undefined, isActive: true });
  const ordersQuery = usePurchaseOrders();
  const invoicesQuery = useSupplierInvoices();
  const createOrder = useCreatePurchaseOrder();
  const approveOrder = useApprovePurchaseOrder();
  const convertOrder = useConvertPurchaseOrder();
  const createInvoice = useCreateSupplierInvoice();
  const postInvoice = usePostSupplierInvoice();
  const partners = (partnerQuery.data?.items ?? []).filter((partner) => partner.supplierProfile?.isActive !== false && partner.supplierProfile);
  const allRows = mode === "orders" ? ordersQuery.data ?? [] : invoicesQuery.data ?? [];
  const rows = search.trim() ? allRows.filter((row) => (row.documentNumber ?? row.id).toLowerCase().includes(search.trim().toLowerCase()) || (row.businessPartner?.displayName ?? "").toLowerCase().includes(search.trim().toLowerCase())) : allRows;
  const canManage = hasPermission(mode === "orders" ? "managePurchaseOrders" : "manageSupplierInvoices");
  const canPost = hasPermission("postSupplierInvoices");
  const canApprove = hasPermission("approvePurchaseOrders");

  const partnerOptions = useMemo<ComboboxOption[]>(() => partners.map((partner) => ({ value: partner.id, label: `${partner.partnerCode} — ${partner.displayName}`, description: partner.email ?? undefined })), [partners]);
  const setLine = (index: number, key: keyof PurchaseLineInput, value: string) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.businessPartnerId || form.lines.some((line) => !line.description.trim())) return;
    try {
      if (mode === "orders") {
        await createOrder.mutateAsync(form);
      } else {
        await createInvoice.mutateAsync(form);
      }
      setForm({ businessPartnerId: "", documentDate: today, currencyCode: "EGP", exchangeRate: "1", lines: [blankLine()] });
      showSuccess(t("messages.created"));
    } catch (error) {
      handleApiError(error, t("messages.createError"));
    }
  };

  const approve = async (id: string) => {
    if (!window.confirm(t("messages.approveConfirm"))) return;
    try { await approveOrder.mutateAsync(id); showSuccess(t("messages.approved")); } catch (error) { handleApiError(error, t("messages.actionError")); }
  };

  const convert = async (id: string) => {
    if (!window.confirm(t("messages.convertConfirm"))) return;
    try { await convertOrder.mutateAsync(id); showSuccess(t("messages.converted")); } catch (error) { handleApiError(error, t("messages.actionError")); }
  };

  const post = async (id: string) => {
    if (!window.confirm(t("messages.postConfirm"))) return;
    try { await postInvoice.mutateAsync({ id, postingDate: today }); showSuccess(t("messages.posted")); } catch (error) { handleApiError(error, t("messages.actionError")); }
  };

  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t(mode === "orders" ? "ordersTitle" : "invoicesTitle")}</h1><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t(mode === "orders" ? "ordersSubtitle" : "invoicesSubtitle")}</p></div>
    {canManage ? <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t(mode === "orders" ? "createOrder" : "createInvoice")}</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div className="lg:col-span-2"><Label>{t("supplier")}</Label><Combobox value={form.businessPartnerId} options={partnerOptions} loading={partnerQuery.isLoading} onChange={(value) => setForm((current) => ({ ...current, businessPartnerId: value ?? "" }))} placeholder={t("chooseSupplier")} searchPlaceholder={t("searchSupplier")} emptyText={t("noSuppliers")} loadingText={t("loading")} /></div><div><Label>{t("documentDate")}</Label><Input type="date" value={form.documentDate} onChange={(event) => setForm((current) => ({ ...current, documentDate: event.target.value }))} /></div><div><Label>{t("currency")}</Label><Input value={form.currencyCode ?? "EGP"} onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} dir="ltr" /></div><div><Label>{t("exchangeRate")}</Label><Input value={form.exchangeRate} onChange={(event) => setForm((current) => ({ ...current, exchangeRate: event.target.value }))} dir="ltr" /></div><div className="lg:col-span-3"><Label>{t("reference")}</Label><Input value={form.supplierReference ?? ""} onChange={(event) => setForm((current) => ({ ...current, supplierReference: event.target.value }))} /></div></div><div className="mt-5 space-y-3"><div className="flex items-center justify-between"><h3 className="font-medium text-gray-900 dark:text-white">{t("lines")}</h3><Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, blankLine()] }))}>{t("addLine")}</Button></div>{form.lines.map((line, index) => <div key={`purchase-line-${index}`} className="grid gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800 md:grid-cols-10"><div className="md:col-span-5"><Label>{t("description")}</Label><Input value={line.description} onChange={(event) => setLine(index, "description", event.target.value)} /></div><div className="md:col-span-2"><Label>{t("quantity")}</Label><Input value={line.quantity} onChange={(event) => setLine(index, "quantity", event.target.value)} dir="ltr" /></div><div className="md:col-span-2"><Label>{t("unitPrice")}</Label><Input value={line.unitPrice} onChange={(event) => setLine(index, "unitPrice", event.target.value)} dir="ltr" /></div><div className="flex items-end md:col-span-1">{form.lines.length > 1 ? <Button type="button" size="sm" variant="ghost" onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))}>×</Button> : null}</div></div>)}</div><div className="mt-5 flex justify-end"><Button type="submit" disabled={createOrder.isPending || createInvoice.isPending}>{t("saveDraft")}</Button></div></form> : null}
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("listTitle")}</h2><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} className="max-w-xs" /></div><QueryState isLoading={mode === "orders" ? ordersQuery.isLoading : invoicesQuery.isLoading} isError={mode === "orders" ? ordersQuery.isError : invoicesQuery.isError} errorMessage={(mode === "orders" ? ordersQuery.error : invoicesQuery.error)?.message} isEmpty={rows.length === 0} emptyTitle={t("emptyTitle")} emptyDescription={t("emptyDescription")}><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400"><th className="px-3 py-3">{t("number")}</th><th className="px-3 py-3">{t("supplier")}</th><th className="px-3 py-3">{t("date")}</th><th className="px-3 py-3">{t("status")}</th><th className="px-3 py-3">{t("actions")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800"><td className="px-3 py-3 font-mono text-xs" dir="ltr">{row.documentNumber ?? row.id.slice(0, 8)}</td><td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{row.businessPartner?.displayName ?? row.businessPartnerId}</td><td className="px-3 py-3" dir="ltr">{row.documentDate.slice(0, 10)}</td><td className="px-3 py-3">{t(`status.${row.status}`)}</td><td className="px-3 py-3"><div className="flex flex-wrap gap-2">{mode === "orders" && row.status === "DRAFT" && canApprove ? <Button size="sm" onClick={() => void approve(row.id)}>{t("approve")}</Button> : null}{mode === "orders" && row.status === "APPROVED" && canManage ? <Button size="sm" variant="outline" onClick={() => void convert(row.id)}>{t("convert")}</Button> : null}{mode === "supplierInvoices" && row.status === "DRAFT" && canPost ? <Button size="sm" onClick={() => void post(row.id)}>{t("post")}</Button> : null}</div></td></tr>)}</tbody></table></div></QueryState></section>
  </div>;
}

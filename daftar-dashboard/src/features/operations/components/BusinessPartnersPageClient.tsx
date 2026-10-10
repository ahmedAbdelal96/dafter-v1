"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { QueryState } from "@/components/common/QueryState";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import {
  useBusinessPartners,
  useCreateBusinessPartner,
  useSetBusinessPartnerActive,
  useUpdateBusinessPartner,
} from "@/lib/api/hooks/use-business-partners";
import type { BusinessPartner, BusinessPartnerInput, BusinessPartnerRole, BusinessPartnerType } from "@/lib/api/types/operations";

type PartnerForm = BusinessPartnerInput & { version?: number };

const emptyForm: PartnerForm = {
  partnerCode: "",
  partnerType: "ORGANIZATION",
  displayName: "",
  email: "",
  phone: "",
  roles: ["CUSTOMER"],
};

export function BusinessPartnersPageClient() {
  const t = useTranslations("operations.partners");
  const { handleApiError, showSuccess } = useErrorHandler();
  const { hasPermission } = usePermission();
  const canManage = hasPermission("managePartners");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const [editing, setEditing] = useState<BusinessPartner | null>(null);

  const query = useBusinessPartners({ search: search || undefined, page: 1, limit: 100 });
  const createMutation = useCreateBusinessPartner();
  const updateMutation = useUpdateBusinessPartner();
  const activeMutation = useSetBusinessPartnerActive();
  const partners = query.data?.items ?? [];

  const typeOptions = useMemo<ComboboxOption[]>(() => [
    { value: "ORGANIZATION", label: t("form.organization") },
    { value: "PERSON", label: t("form.person") },
  ], [t]);

  const setField = <K extends keyof PartnerForm>(key: K, value: PartnerForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleRole = (role: BusinessPartnerRole) => {
    setForm((current) => {
      const roles = current.roles ?? [];
      return { ...current, roles: roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role] };
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.displayName.trim() || !form.partnerCode.trim() || !form.roles?.length) return;
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: {
            displayName: form.displayName.trim(),
            email: form.email?.trim() || undefined,
            phone: form.phone?.trim() || undefined,
            legalName: form.legalName?.trim() || undefined,
            version: editing.version,
          },
        });
        showSuccess(t("messages.updated"));
      } else {
        await createMutation.mutateAsync({
          ...form,
          partnerCode: form.partnerCode.trim(),
          displayName: form.displayName.trim(),
          email: form.email?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
        });
        showSuccess(t("messages.created"));
      }
      resetForm();
    } catch (error) {
      handleApiError(error, t("messages.saveError"));
    }
  };

  const startEdit = (partner: BusinessPartner) => {
    setEditing(partner);
    setForm({
      partnerCode: partner.partnerCode,
      partnerType: partner.partnerType,
      displayName: partner.displayName,
      legalName: partner.legalName ?? "",
      email: partner.email ?? "",
      phone: partner.phone ?? "",
      roles: [
        ...(partner.customerProfile ? ["CUSTOMER" as const] : []),
        ...(partner.supplierProfile ? ["SUPPLIER" as const] : []),
      ],
      version: partner.version,
    });
  };

  const toggleActive = async (partner: BusinessPartner) => {
    if (!window.confirm(t(partner.isActive ? "messages.deactivateConfirm" : "messages.activateConfirm", { name: partner.displayName }))) return;
    try {
      await activeMutation.mutateAsync({ id: partner.id, isActive: !partner.isActive, version: partner.version });
      showSuccess(t("messages.statusUpdated"));
    } catch (error) {
      handleApiError(error, t("messages.statusError"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
      </div>

      {canManage ? (
        <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? t("form.editTitle") : t("form.createTitle")}</h2>
            {editing ? <Button variant="ghost" size="sm" onClick={resetForm}>{t("actions.cancel")}</Button> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div><Label>{t("form.code")}</Label><Input value={form.partnerCode} disabled={Boolean(editing)} onChange={(event) => setField("partnerCode", event.target.value)} /></div>
            <div><Label>{t("form.type")}</Label><Combobox value={form.partnerType} options={typeOptions} onChange={(value) => setField("partnerType", (value ?? "ORGANIZATION") as BusinessPartnerType)} placeholder={t("form.chooseType")} /></div>
            <div className="lg:col-span-2"><Label>{t("form.name")}</Label><Input value={form.displayName} onChange={(event) => setField("displayName", event.target.value)} /></div>
            <div><Label>{t("form.email")}</Label><Input type="email" value={form.email ?? ""} onChange={(event) => setField("email", event.target.value)} dir="ltr" /></div>
            <div><Label>{t("form.phone")}</Label><Input value={form.phone ?? ""} onChange={(event) => setField("phone", event.target.value)} dir="ltr" /></div>
            {!editing ? (
              <fieldset className="flex items-center gap-4 md:col-span-2">
                <legend className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">{t("form.roles")}</legend>
                {(["CUSTOMER", "SUPPLIER"] as const).map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={form.roles?.includes(role) ?? false} onChange={() => toggleRole(role)} />
                    {t(`form.${role.toLowerCase()}`)}
                  </label>
                ))}
              </fieldset>
            ) : null}
          </div>
          <div className="mt-4 flex justify-end"><Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editing ? t("actions.save") : t("actions.create")}</Button></div>
        </form>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("listTitle")}</h2>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} className="sm:max-w-xs" />
        </div>
        <QueryState isLoading={query.isLoading} isError={query.isError} errorMessage={query.error?.message} errorAction={{ label: t("actions.retry"), onClick: () => void query.refetch() }} isEmpty={!query.isLoading && partners.length === 0} emptyTitle={t("emptyTitle")} emptyDescription={t("emptyDescription")}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm"><thead><tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400"><th className="px-3 py-3">{t("table.code")}</th><th className="px-3 py-3">{t("table.name")}</th><th className="px-3 py-3">{t("table.roles")}</th><th className="px-3 py-3">{t("table.status")}</th><th className="px-3 py-3">{t("table.actions")}</th></tr></thead><tbody>
              {partners.map((partner) => {
                const roles = [partner.customerProfile ? t("form.customer") : "", partner.supplierProfile ? t("form.supplier") : ""].filter(Boolean).join(" / ");
                return <tr key={partner.id} className="border-b border-gray-100 dark:border-gray-800"><td className="px-3 py-3 font-mono text-xs" dir="ltr">{partner.partnerCode}</td><td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{partner.displayName}</td><td className="px-3 py-3 text-gray-600 dark:text-gray-300">{roles}</td><td className="px-3 py-3"><span className={partner.isActive ? "text-success-600" : "text-error-600"}>{partner.isActive ? t("active") : t("inactive")}</span></td><td className="px-3 py-3"><div className="flex flex-wrap gap-2">{canManage ? <><Button size="sm" variant="ghost" onClick={() => startEdit(partner)}>{t("actions.edit")}</Button><Button size="sm" variant="outline" onClick={() => void toggleActive(partner)} disabled={activeMutation.isPending}>{partner.isActive ? t("actions.deactivate") : t("actions.activate")}</Button></> : null}</div></td></tr>;
              })}
            </tbody></table>
          </div>
        </QueryState>
      </section>
    </div>
  );
}

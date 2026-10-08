import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { CashReconciliationSettingsClient } from "@/features/settings/components/CashReconciliationSettingsClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });

  return {
    title: t("cashReconciliation.pageTitle"),
    description: t("cashReconciliation.pageDescription"),
  };
}

export default async function CashReconciliationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "users:view", `/${locale}/settings/cash-reconciliation`);

  return <CashReconciliationSettingsClient />;
}

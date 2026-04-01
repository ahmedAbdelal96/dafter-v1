import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompanySettingsClient } from "@/features/settings/components/CompanySettingsClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return {
    title: t("company.pageTitle"),
    description: t("company.pageDescription"),
  };
}

export default async function CompanySettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Only OWNER role should edit company profile; staff can view via subscription guard.
  // We reuse the same "users:view" gate as the settings hub for consistency.
  await requirePermission(locale, "users:view", `/${locale}/settings`);

  return <CompanySettingsClient />;
}


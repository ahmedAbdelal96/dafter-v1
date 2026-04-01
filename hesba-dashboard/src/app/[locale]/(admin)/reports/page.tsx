import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportsPageClient } from "@/features/reports/components/ReportsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reports" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ReportsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "reports:view", `/${locale}/reports`);

  return <ReportsPageClient />;
}


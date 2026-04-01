import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DeferredSalesPageClient } from "@/features/deferred-sales/components/DeferredSalesPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "deferred-sales" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function DeferredSalesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "deferredSales:view", `/${locale}/deferred-sales`);

  return <DeferredSalesPageClient />;
}


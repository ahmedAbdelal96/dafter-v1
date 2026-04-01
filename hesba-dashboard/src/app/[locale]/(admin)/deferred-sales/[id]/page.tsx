import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DeferredSaleDetailsPageClient } from "@/features/deferred-sales/components/DeferredSaleDetailsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "deferred-sales" });

  return {
    title: t("details.pageTitle"),
    description: t("details.pageDescription"),
  };
}

export default async function DeferredSaleDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "deferredSales:view", `/${locale}/deferred-sales/${id}`);

  return <DeferredSaleDetailsPageClient saleId={id} />;
}


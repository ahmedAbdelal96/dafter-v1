import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SupplierDetailsPageClient } from "@/features/suppliers/components/SupplierDetailsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "suppliers" });

  return {
    title: t("details.pageTitle"),
    description: t("details.pageDescription"),
  };
}

export default async function SupplierDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "suppliers:view", `/${locale}/suppliers/${id}`);

  return <SupplierDetailsPageClient supplierId={id} />;
}


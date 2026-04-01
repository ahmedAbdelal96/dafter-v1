import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductsPageClient } from "@/features/products/components/ProductsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "products" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ProductsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "products:view", `/${locale}/products`);

  return <ProductsPageClient />;
}


import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductDetailsPageClient } from "@/features/products/components/ProductDetailsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "products" });

  return {
    title: t("details.pageTitle"),
    description: t("details.pageDescription"),
  };
}

export default async function ProductDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "products:view", `/${locale}/products/${id}`);

  return <ProductDetailsPageClient productId={id} />;
}


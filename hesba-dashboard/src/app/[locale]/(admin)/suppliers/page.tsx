import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SuppliersPageClient } from "@/features/suppliers/components/SuppliersPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "suppliers" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function SuppliersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "suppliers:view", `/${locale}/suppliers`);

  return <SuppliersPageClient />;
}

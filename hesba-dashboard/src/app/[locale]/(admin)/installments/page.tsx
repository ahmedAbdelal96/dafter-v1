import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InstallmentsPageClient } from "@/features/installments/components/InstallmentsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "installments" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function InstallmentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "installments:view", `/${locale}/installments`);

  return <InstallmentsPageClient />;
}


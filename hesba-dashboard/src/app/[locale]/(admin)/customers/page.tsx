import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CustomersPageClient } from "@/features/customers/components/CustomersPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "customers" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function CustomersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "customers:view", `/${locale}/customers`);

  return <CustomersPageClient />;
}


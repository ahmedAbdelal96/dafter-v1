import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CustomerDetailsPageClient } from "@/features/customers/components/CustomerDetailsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "customers" });

  return {
    title: t("details.pageTitle"),
    description: t("details.pageDescription"),
  };
}

export default async function CustomerDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "customers:view", `/${locale}/customers/${id}`);

  return <CustomerDetailsPageClient customerId={id} />;
}


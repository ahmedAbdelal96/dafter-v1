import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InvoicesPageClient } from "@/features/invoices/components/InvoicesPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "invoices" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function InvoicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "invoices:view", `/${locale}/invoices`);

  return <InvoicesPageClient />;
}


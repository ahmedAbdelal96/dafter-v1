import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InvoiceDetailsPageClient } from "@/features/invoices/components/InvoiceDetailsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "invoices" });

  return {
    title: t("details.pageTitle"),
    description: t("details.pageDescription"),
  };
}

export default async function InvoiceDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "invoices:view", `/${locale}/invoices/${id}`);

  return <InvoiceDetailsPageClient invoiceId={id} />;
}


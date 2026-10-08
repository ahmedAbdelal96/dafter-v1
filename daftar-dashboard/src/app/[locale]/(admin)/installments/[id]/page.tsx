import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InstallmentDetailsPageClient } from "@/features/installments/components/InstallmentDetailsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "installments" });

  return {
    title: t("details.pageTitle"),
    description: t("details.pageDescription"),
  };
}

export default async function InstallmentDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "installments:view", `/${locale}/installments/${id}`);

  return <InstallmentDetailsPageClient contractId={id} />;
}


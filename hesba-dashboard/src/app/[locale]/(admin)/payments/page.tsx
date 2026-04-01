import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaymentsPageClient } from "@/features/payments/components/PaymentsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payments" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function PaymentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "ledger:create", `/${locale}/payments`);

  return <PaymentsPageClient />;
}



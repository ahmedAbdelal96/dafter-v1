import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExpensesPageClient } from "@/features/expenses/components/ExpensesPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "expenses" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function ExpensesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "ledger:view", `/${locale}/expenses`);

  return <ExpensesPageClient />;
}


import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExpenseDetailsPageClient } from "@/features/expenses/components/ExpenseDetailsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "expenses" });

  return {
    title: t("details.pageTitle"),
    description: t("details.pageDescription"),
  };
}

export default async function ExpenseDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "ledger:view", `/${locale}/expenses/${id}`);

  return <ExpenseDetailsPageClient expenseId={id} />;
}


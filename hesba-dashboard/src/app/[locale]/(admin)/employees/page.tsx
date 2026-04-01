import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmployeesPageClient } from "@/features/employees/components/EmployeesPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "employees" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function EmployeesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "employees:view", `/${locale}/employees`);

  return <EmployeesPageClient />;
}


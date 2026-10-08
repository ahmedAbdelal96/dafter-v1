import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmployeesPayrollPageClient } from "@/features/employees/components/EmployeesPayrollPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "employees" });

  return {
    title: t("payroll.pageTitle"),
    description: t("payroll.pageDescription"),
  };
}

export default async function EmployeesPayrollPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "ledger:view", `/${locale}/employees/payroll`);

  return <EmployeesPayrollPageClient />;
}


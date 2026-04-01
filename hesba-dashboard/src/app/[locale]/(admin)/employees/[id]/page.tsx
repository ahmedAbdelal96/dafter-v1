import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmployeeDetailsPageClient } from "@/features/employees/components/EmployeeDetailsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "employees" });

  return {
    title: t("details.pageTitle"),
    description: t("details.pageDescription"),
  };
}

export default async function EmployeeDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "employees:view", `/${locale}/employees/${id}`);

  return <EmployeeDetailsPageClient employeeId={id} />;
}


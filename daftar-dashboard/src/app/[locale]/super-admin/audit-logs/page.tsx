import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlatformAuditLogsPageClient } from "@/features/platform-audit/components/PlatformAuditLogsPageClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "platformAudit.meta" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function PlatformAuditLogsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PlatformAuditLogsPageClient />;
}


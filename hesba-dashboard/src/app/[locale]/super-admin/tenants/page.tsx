import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlatformTenantsPageClient } from "@/features/platform-management/components/PlatformTenantsPageClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "platformManagement.tenants.meta",
  });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function TenantsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PlatformTenantsPageClient />;
}

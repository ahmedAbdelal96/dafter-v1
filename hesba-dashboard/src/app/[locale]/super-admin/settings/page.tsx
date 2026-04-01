import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlatformSettingsPageClient } from "@/features/platform-settings/components/PlatformSettingsPageClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "platformSettings" });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function SuperAdminSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PlatformSettingsPageClient />;
}

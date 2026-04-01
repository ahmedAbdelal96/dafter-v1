import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlatformPlansPageClient } from "@/features/platform-management/components/PlatformPlansPageClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "platformManagement.plansManagement",
  });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function PlansPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PlatformPlansPageClient />;
}


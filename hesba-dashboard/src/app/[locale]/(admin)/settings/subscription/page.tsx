import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SubscriptionPageClient } from "@/features/entitlements/components/SubscriptionPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "entitlements" });
  return {
    title: t("page.pageTitle"),
    description: t("page.pageDescription"),
  };
}

export default async function SubscriptionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "users:view", `/${locale}/settings/subscription`);

  return <SubscriptionPageClient />;
}


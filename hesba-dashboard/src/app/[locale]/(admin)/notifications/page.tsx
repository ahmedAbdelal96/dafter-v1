import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotificationsPageClient } from "@/features/notifications/components/NotificationsPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notifications" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function NotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "notifications:view", `/${locale}/notifications`);

  return <NotificationsPageClient />;
}



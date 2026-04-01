import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PlatformAnalyticsPageClient } from "@/features/platform-analytics/components/PlatformAnalyticsPageClient";

export const metadata: Metadata = {
  title: "Platform Analytics | Daftar Super Admin",
  description: "Subscription health, plan distribution and revenue analytics",
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PlatformAnalyticsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PlatformAnalyticsPageClient />;
}

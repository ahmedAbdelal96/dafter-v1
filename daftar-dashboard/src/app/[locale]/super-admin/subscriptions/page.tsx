import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PlatformSubscriptionsPageClient } from "@/features/platform-management/components/PlatformSubscriptionsPageClient";

export const metadata: Metadata = {
  title: "Subscriptions | dafter Super Admin",
  description: "Manage subscriptions and billing",
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SubscriptionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PlatformSubscriptionsPageClient />;
}

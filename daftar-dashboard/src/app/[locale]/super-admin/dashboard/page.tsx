import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PlatformDashboardPageClient } from "@/features/platform-dashboard/components/PlatformDashboardPageClient";

export const metadata: Metadata = {
  title: "Platform Dashboard | dafter Super Admin",
  description: "dafter platform management dashboard",
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SuperAdminDashboard({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PlatformDashboardPageClient />;
}

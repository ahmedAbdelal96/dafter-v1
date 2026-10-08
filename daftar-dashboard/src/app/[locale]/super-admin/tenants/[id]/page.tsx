import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PlatformCompanyDetailsPageClient } from "@/features/platform-management/components/PlatformCompanyDetailsPageClient";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tenant Details | Daftar Super Admin",
    description: "Detailed tenant workspace view for platform operations.",
  };
}

export default async function TenantDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <PlatformCompanyDetailsPageClient companyId={id} />;
}


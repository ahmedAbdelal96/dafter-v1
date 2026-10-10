import { BusinessPartnersPageClient } from "@/features/operations/components/BusinessPartnersPageClient";
import { requirePermission } from "@/lib/auth/guards";

export default async function BusinessPartnersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission(locale, "viewPartners", `/${locale}/business-partners`);
  return <BusinessPartnersPageClient />;
}

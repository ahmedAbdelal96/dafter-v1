import { OpenItemsPageClient } from "@/features/operations/components/OpenItemsPageClient";
import { requirePermission } from "@/lib/auth/guards";

export default async function APOpenItemsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission(locale, "viewSupplierPayments", `/${locale}/ap-open-items`);
  return <OpenItemsPageClient mode="ap" />;
}

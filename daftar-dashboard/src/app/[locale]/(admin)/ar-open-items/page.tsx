import { OpenItemsPageClient } from "@/features/operations/components/OpenItemsPageClient";
import { requirePermission } from "@/lib/auth/guards";

export default async function AROpenItemsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission(locale, "viewCustomerPayments", `/${locale}/ar-open-items`);
  return <OpenItemsPageClient mode="ar" />;
}

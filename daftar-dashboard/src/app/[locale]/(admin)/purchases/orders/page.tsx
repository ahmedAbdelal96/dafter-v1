import { PurchasesPageClient } from "@/features/operations/components/PurchasesPageClient";
import { requirePermission } from "@/lib/auth/guards";

export default async function PurchaseOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission(locale, "viewPurchaseOrders", `/${locale}/purchases/orders`);
  return <PurchasesPageClient mode="orders" />;
}

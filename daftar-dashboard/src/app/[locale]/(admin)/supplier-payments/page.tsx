import { PartyPaymentsPageClient } from "@/features/operations/components/PartyPaymentsPageClient";
import { requirePermission } from "@/lib/auth/guards";

export default async function SupplierPaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission(locale, "viewSupplierPayments", `/${locale}/supplier-payments`);
  return <PartyPaymentsPageClient mode="supplier" />;
}

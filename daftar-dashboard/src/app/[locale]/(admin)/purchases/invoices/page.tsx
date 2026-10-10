import { PurchasesPageClient } from "@/features/operations/components/PurchasesPageClient";
import { requirePermission } from "@/lib/auth/guards";

export default async function SupplierInvoicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission(locale, "viewSupplierInvoices", `/${locale}/purchases/invoices`);
  return <PurchasesPageClient mode="supplierInvoices" />;
}

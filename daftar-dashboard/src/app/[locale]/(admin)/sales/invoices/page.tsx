import { SalesInvoicesPageClient } from "@/features/operations/components/SalesInvoicesPageClient";
import { requirePermission } from "@/lib/auth/guards";

export default async function SalesInvoicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission(locale, "viewSalesInvoices", `/${locale}/sales/invoices`);
  return <SalesInvoicesPageClient />;
}

import { SalesCreditNotesPageClient } from "@/features/operations/components/SalesCreditNotesPageClient";
import { requirePermission } from "@/lib/auth/guards";

export default async function SalesCreditNotesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission(locale, "viewSalesCreditNotes", `/${locale}/sales/credit-notes`);
  return <SalesCreditNotesPageClient />;
}

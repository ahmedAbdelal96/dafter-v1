import { requirePermission } from "@/lib/auth/guards";
import { SupplierCreditNotesPageClient } from "@/features/operations/components/SupplierCreditNotesPageClient";

export default async function SupplierCreditNotesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission(locale, "viewSupplierCreditNotes", `/${locale}/purchases/credit-notes`);
  return <SupplierCreditNotesPageClient />;
}

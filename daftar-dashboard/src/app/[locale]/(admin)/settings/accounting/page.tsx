import { AccountingSetupPageClient } from "@/features/operations/components/AccountingSetupPageClient";
import { requirePermission } from "@/lib/auth/guards";

export default async function AccountingSetupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePermission(locale, "viewAccountingSetup", `/${locale}/settings/accounting`);
  return <AccountingSetupPageClient />;
}

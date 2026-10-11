import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { FinancialReportPageClient } from "@/features/financial-reports/FinancialReportPageClient";

const reports = ["general-ledger", "trial-balance", "profit-loss", "balance-sheet", "ar-aging", "ap-aging", "customer-statements", "supplier-statements", "finance-closure"] as const;
type Props = { params: Promise<{ locale: string; report: string }> };

export default async function FinancialReportPage({ params }: Props) { const { locale, report } = await params; if (!reports.includes(report as (typeof reports)[number])) notFound(); await requirePermission(locale, "reports:view", `/${locale}/reports/${report}`); return <FinancialReportPageClient locale={locale} report={report as (typeof reports)[number]} />; }

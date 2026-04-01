import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { REPORTS_ACCENT, toFloat, type DateRangeParams } from '../types';
import { LedgerStatementSection } from './LedgerStatementSection';
import {
  useCashFlowReport,
  useCollectionsFollowupReport,
  useCriticalAlertsReport,
  useCustomersAgingReport,
  useDebtsSummaryReport,
  useExpensesAnalyticsReport,
  useOperationalPerformanceReport,
  useProductsPerformanceReport,
  useProfitLossReport,
  useSalesDetailedReport,
  useStaffActivityReport,
  useSuppliersAgingReport,
} from '../hooks/useReports';

function fmt(value: string | number) {
  return toFloat(value).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.statRow}>
      <ZText size="sm" style={{ color: palette.textSecondary }}>
        {label}
      </ZText>
      <ZText weight="bold" size="sm" style={{ color: palette.text }}>
        {value}
      </ZText>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: { label: string; value: string | number }[];
}) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.card, { backgroundColor: isDark ? Colors.dark.surface : '#fff' }]}>
      <ZText weight="bold" style={{ color: palette.text }}>
        {title}
      </ZText>
      {subtitle ? (
        <ZText size="xs" variant="secondary">
          {subtitle}
        </ZText>
      ) : null}
      <View style={styles.cardRows}>
        {rows.map((row) => (
          <StatRow key={row.label} label={row.label} value={row.value} />
        ))}
      </View>
    </View>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.sectionHeading}>
      <ZText weight="bold" size="md" style={{ color: palette.text }}>
        {title}
      </ZText>
      <ZText size="sm" variant="secondary">
        {description}
      </ZText>
    </View>
  );
}

export function AdvancedReportsTab({ params }: { params: DateRangeParams }) {
  const { isDark } = useTheme();
  const { t } = useTranslation('reports');
  const palette = isDark ? Colors.dark : Colors.light;

  const profitLoss = useProfitLossReport(params);
  const cashFlow = useCashFlowReport(params);
  const customersAging = useCustomersAgingReport(params);
  const suppliersAging = useSuppliersAgingReport(params);
  const salesDetailed = useSalesDetailedReport(params);
  const collectionsFollowup = useCollectionsFollowupReport(params);
  const expensesAnalytics = useExpensesAnalyticsReport(params);
  const debtsSummary = useDebtsSummaryReport(params);
  const productsPerformance = useProductsPerformanceReport(params);
  const operationalPerformance = useOperationalPerformanceReport(params);
  const criticalAlerts = useCriticalAlertsReport(params);
  const staffActivity = useStaffActivityReport(params);

  const isLoading =
    profitLoss.isLoading ||
    cashFlow.isLoading ||
    customersAging.isLoading ||
    suppliersAging.isLoading ||
    salesDetailed.isLoading ||
    collectionsFollowup.isLoading ||
    expensesAnalytics.isLoading ||
    debtsSummary.isLoading ||
    productsPerformance.isLoading ||
    operationalPerformance.isLoading ||
    criticalAlerts.isLoading ||
    staffActivity.isLoading;

  const hasError =
    profitLoss.isError ||
    cashFlow.isError ||
    customersAging.isError ||
    suppliersAging.isError ||
    salesDetailed.isError ||
    collectionsFollowup.isError;

  const refetchAll = () => {
    void Promise.all([
      profitLoss.refetch(),
      cashFlow.refetch(),
      customersAging.refetch(),
      suppliersAging.refetch(),
      salesDetailed.refetch(),
      collectionsFollowup.refetch(),
      expensesAnalytics.refetch(),
      debtsSummary.refetch(),
      productsPerformance.refetch(),
      operationalPerformance.refetch(),
      criticalAlerts.refetch(),
      staffActivity.refetch(),
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={REPORTS_ACCENT} size="large" />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={palette.textMuted} />
        <ZText variant="secondary" size="sm">
          {t('errors.loadFailed', { defaultValue: 'Failed to load report' })}
        </ZText>
        <TouchableOpacity onPress={refetchAll} style={styles.retryBtn}>
          <ZText size="sm" style={{ color: REPORTS_ACCENT }}>
            {t('errors.retry', { defaultValue: 'Retry' })}
          </ZText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SectionHeading
        title={t('advanced.priorityInsightsTitle', { defaultValue: 'Priority insights' })}
        description={t('advanced.priorityInsightsDescription', {
          defaultValue: 'Start here for the most important business signals in the selected period.',
        })}
      />

      <SectionCard
        title={t('advanced.criticalAlerts.title')}
        subtitle={t('advanced.criticalAlerts.subtitle', {
          defaultValue: 'Watch urgent credit, overdue, and installment risks first.',
        })}
        rows={[
          {
            label: t('advanced.criticalAlerts.creditRisk'),
            value: criticalAlerts.data?.summary.creditRiskCount ?? 0,
          },
          {
            label: t('advanced.criticalAlerts.largeOverdues'),
            value: criticalAlerts.data?.summary.largeOverduesCount ?? 0,
          },
          {
            label: t('advanced.criticalAlerts.upcomingInstallments'),
            value: criticalAlerts.data?.summary.upcomingInstallmentsCount ?? 0,
          },
        ]}
      />

      <SectionCard
        title={t('advanced.profitLoss.title')}
        subtitle={t('advanced.profitLoss.subtitle', {
          defaultValue: 'Revenue, expenses, and margin in one quick block.',
        })}
        rows={[
          {
            label: t('advanced.profitLoss.netSales'),
            value: fmt(profitLoss.data?.revenue.netSales ?? 0),
          },
          {
            label: t('advanced.profitLoss.expenses'),
            value: fmt(profitLoss.data?.expenses.total ?? 0),
          },
          {
            label: t('advanced.profitLoss.netProfit'),
            value: fmt(profitLoss.data?.profit.netProfit ?? 0),
          },
        ]}
      />

      <SectionCard
        title={t('advanced.cashFlow.title')}
        subtitle={t('advanced.cashFlow.subtitle', {
          defaultValue: 'Use this when you need to understand daily cash movement quickly.',
        })}
        rows={[
          { label: t('advanced.cashFlow.inflow'), value: fmt(cashFlow.data?.totals.inflow ?? 0) },
          { label: t('advanced.cashFlow.outflow'), value: fmt(cashFlow.data?.totals.outflow ?? 0) },
          {
            label: t('advanced.cashFlow.closingBalance'),
            value: fmt(cashFlow.data?.totals.closingBalance ?? 0),
          },
        ]}
      />

      <SectionCard
        title={t('advanced.customersAging.title')}
        subtitle={t('advanced.customersAging.subtitle', {
          defaultValue: 'Track customer balances that still need follow-up.',
        })}
        rows={[
          {
            label: t('advanced.customersAging.parties'),
            value: customersAging.data?.summary.partiesCount ?? 0,
          },
          {
            label: t('advanced.customersAging.outstanding'),
            value: fmt(customersAging.data?.summary.totalOutstanding ?? 0),
          },
        ]}
      />

      <SectionCard
        title={t('advanced.collectionsFollowup.title')}
        subtitle={t('advanced.collectionsFollowup.subtitle', {
          defaultValue: 'Check expected vs collected amounts before opening detailed follow-up.',
        })}
        rows={[
          {
            label: t('advanced.collectionsFollowup.expected'),
            value: fmt(collectionsFollowup.data?.summary.expectedAmount ?? 0),
          },
          {
            label: t('advanced.collectionsFollowup.collected'),
            value: fmt(collectionsFollowup.data?.summary.collectedAmount ?? 0),
          },
          {
            label: t('advanced.collectionsFollowup.collectionRate'),
            value: `${collectionsFollowup.data?.summary.collectionRatePercent ?? '0'}%`,
          },
        ]}
      />

      <SectionHeading
        title={t('advanced.agingSectionTitle', { defaultValue: 'Aging and follow-up' })}
        description={t('advanced.agingSectionDescription', {
          defaultValue: 'These sections help you review overdue balances and collection workload.',
        })}
      />

      <SectionCard
        title={t('advanced.suppliersAging.title')}
        subtitle={t('advanced.suppliersAging.subtitle', {
          defaultValue: 'Review supplier balances that may need settlement planning.',
        })}
        rows={[
          {
            label: t('advanced.suppliersAging.parties'),
            value: suppliersAging.data?.summary.partiesCount ?? 0,
          },
          {
            label: t('advanced.suppliersAging.outstanding'),
            value: fmt(suppliersAging.data?.summary.totalOutstanding ?? 0),
          },
        ]}
      />

      <SectionCard
        title={t('advanced.expensesAnalytics.title')}
        subtitle={t('advanced.expensesAnalytics.subtitle', {
          defaultValue: 'Review spending trends without opening the full detailed report first.',
        })}
        rows={[
          {
            label: t('advanced.expensesAnalytics.count'),
            value: expensesAnalytics.data?.summary.expensesCount ?? 0,
          },
          {
            label: t('advanced.expensesAnalytics.total'),
            value: fmt(expensesAnalytics.data?.summary.totalAmount ?? 0),
          },
          {
            label: t('advanced.expensesAnalytics.average'),
            value: fmt(expensesAnalytics.data?.summary.averageExpense ?? 0),
          },
        ]}
      />

      <SectionCard
        title={t('advanced.debtsSummary.title')}
        subtitle={t('advanced.debtsSummary.subtitle', {
          defaultValue: 'A quick net view of receivables and payables.',
        })}
        rows={[
          {
            label: t('advanced.debtsSummary.customersReceivable'),
            value: fmt(debtsSummary.data?.summary.customersReceivable ?? 0),
          },
          {
            label: t('advanced.debtsSummary.suppliersPayable'),
            value: fmt(debtsSummary.data?.summary.suppliersPayable ?? 0),
          },
          {
            label: t('advanced.debtsSummary.netReceivable'),
            value: fmt(debtsSummary.data?.summary.netReceivable ?? 0),
          },
        ]}
      />

      <SectionCard
        title={t('advanced.productsPerformance.title')}
        subtitle={t('advanced.productsPerformance.subtitle', {
          defaultValue: 'Spot product movement and sales concentration quickly.',
        })}
        rows={[
          {
            label: t('advanced.productsPerformance.products'),
            value: productsPerformance.data?.summary.totalProducts ?? 0,
          },
          {
            label: t('advanced.productsPerformance.quantity'),
            value: productsPerformance.data?.summary.totalQuantity ?? 0,
          },
          {
            label: t('advanced.productsPerformance.salesAmount'),
            value: fmt(productsPerformance.data?.summary.totalSalesAmount ?? 0),
          },
        ]}
      />

      <SectionCard
        title={t('advanced.operationalPerformance.title')}
        subtitle={t('advanced.operationalPerformance.subtitle', {
          defaultValue: 'Track revenue quality, expense pressure, and collection efficiency.',
        })}
        rows={[
          {
            label: t('advanced.operationalPerformance.revenue'),
            value: fmt(operationalPerformance.data?.revenue.revenue ?? 0),
          },
          {
            label: t('advanced.operationalPerformance.expenses'),
            value: fmt(operationalPerformance.data?.expenses.total ?? 0),
          },
          {
            label: t('advanced.operationalPerformance.collectionRate'),
            value: `${operationalPerformance.data?.collections.collectionRate ?? '0'}%`,
          },
        ]}
      />

      <SectionCard
        title={t('advanced.salesDetailed.title')}
        subtitle={t('advanced.salesDetailed.subtitle', {
          defaultValue: 'Open this when you need invoice-level sales details for investigation.',
        })}
        rows={[
          {
            label: t('advanced.salesDetailed.invoices'),
            value: salesDetailed.data?.summary.invoicesCount ?? 0,
          },
          {
            label: t('advanced.salesDetailed.netAmount'),
            value: fmt(salesDetailed.data?.summary.netAmount ?? 0),
          },
        ]}
      />

      <SectionCard
        title={t('advanced.staffActivity.title')}
        subtitle={t('advanced.staffActivity.subtitle', {
          defaultValue: 'Keep this for manager review of team contribution and transaction load.',
        })}
        rows={[
          {
            label: t('advanced.staffActivity.users'),
            value: staffActivity.data?.summary.usersCount ?? 0,
          },
          {
            label: t('advanced.staffActivity.activities'),
            value: staffActivity.data?.summary.totalActivities ?? 0,
          },
          {
            label: t('advanced.staffActivity.invoicesAmount'),
            value: fmt(staffActivity.data?.summary.totalInvoiceAmount ?? 0),
          },
        ]}
      />

      <SectionHeading
        title={t('advanced.detailSectionTitle', { defaultValue: 'Detailed statements' })}
        description={t('advanced.detailSectionDescription', {
          defaultValue: 'Use these only when you need deeper transaction-level review.',
        })}
      />

      <LedgerStatementSection params={params} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },
  content: {
    padding: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[3],
  },
  sectionHeading: {
    gap: Spacing[1],
    marginBottom: Spacing[1],
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRows: {
    gap: Spacing[2],
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  retryBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const checks = [
  {
    file: 'src/features/reports/api/reports.api.ts',
    snippets: [
      'const reportsApi = {',
      'getProfitLoss: async',
      'getCashFlow: async',
      'getCustomersAging: async',
      'getSuppliersAging: async',
      'getSalesDetailed: async',
      'getCollectionsFollowup: async',
      'function toAgingQuery(params?: DateRangeParams): { asOfDate?: string } | undefined',
      'return { asOfDate: params.dateTo ?? params.dateFrom };',
    ],
  },
  {
    file: 'src/features/reports/hooks/useReports.ts',
    snippets: [
      'export function useProfitLossReport',
      'export function useCashFlowReport',
      'export function useCustomersAgingReport',
      'export function useSuppliersAgingReport',
      'export function useSalesDetailedReport',
      'export function useCollectionsFollowupReport',
    ],
  },
  {
    file: 'src/app/(client)/reports.tsx',
    snippets: [
      "type TabKey = 'summary' | 'overdue' | 'collection' | 'advanced';",
      "const [activePreset, setActivePreset] = useState<DatePreset>('THIS_MONTH');",
      'const dateParams = useMemo(() => getPresetDates(activePreset), [activePreset]);',
      '<AdvancedReportsTab params={dateParams} />',
      '<CollectionTab params={dateParams} />',
    ],
  },
  {
    file: 'src/features/reports/components/AdvancedReportsTab.tsx',
    snippets: [
      "const { t } = useTranslation('reports');",
      "t('advanced.profitLoss.title')",
      "t('advanced.cashFlow.title')",
      "t('advanced.customersAging.title')",
      "t('advanced.suppliersAging.title')",
      "t('advanced.salesDetailed.title')",
      "t('advanced.collectionsFollowup.title')",
    ],
  },
];

const failures = [];

for (const check of checks) {
  const absolutePath = resolve(process.cwd(), check.file);
  const content = readFileSync(absolutePath, 'utf8');

  for (const snippet of check.snippets) {
    if (!content.includes(snippet)) {
      failures.push(`${check.file} is missing required snippet: ${snippet}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Reports contract smoke check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Reports contract smoke check passed.');

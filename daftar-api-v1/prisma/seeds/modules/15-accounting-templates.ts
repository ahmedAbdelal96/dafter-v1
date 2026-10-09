import { AccountingAccountType } from '@prisma/client';
import { SeedContext } from '../types';

type TemplateAccountSeed = {
  stableKey: string;
  code: string;
  arabicName: string;
  englishName: string;
  accountType: AccountingAccountType;
  parentKey?: string;
  allowDirectPosting?: boolean;
  isControlAccount?: boolean;
  reconciliationEligible?: boolean;
  systemKey?: string;
};

const EG_STANDARD_V1_ACCOUNTS: TemplateAccountSeed[] = [
  { stableKey: 'ASSETS', code: '1000', arabicName: 'الأصول', englishName: 'Assets', accountType: AccountingAccountType.ASSET_CURRENT, allowDirectPosting: false },
  { stableKey: 'CASH', code: '1100', arabicName: 'النقدية', englishName: 'Cash', accountType: AccountingAccountType.ASSET_CASH, parentKey: 'ASSETS', systemKey: 'CASH' },
  { stableKey: 'BANKS', code: '1200', arabicName: 'البنوك', englishName: 'Banks', accountType: AccountingAccountType.ASSET_BANK, parentKey: 'ASSETS', systemKey: 'BANK' },
  { stableKey: 'AR_CONTROL', code: '1300', arabicName: 'العملاء', englishName: 'Accounts Receivable', accountType: AccountingAccountType.ASSET_RECEIVABLE, parentKey: 'ASSETS', allowDirectPosting: false, isControlAccount: true, reconciliationEligible: true, systemKey: 'AR_CONTROL' },
  { stableKey: 'INVENTORY', code: '1400', arabicName: 'المخزون', englishName: 'Inventory', accountType: AccountingAccountType.ASSET_INVENTORY, parentKey: 'ASSETS', systemKey: 'INVENTORY' },
  { stableKey: 'PREPAID', code: '1500', arabicName: 'مصروفات مقدمة', englishName: 'Prepaid Expenses', accountType: AccountingAccountType.ASSET_PREPAID, parentKey: 'ASSETS' },
  { stableKey: 'FIXED_ASSETS', code: '1600', arabicName: 'الأصول الثابتة', englishName: 'Fixed Assets', accountType: AccountingAccountType.ASSET_FIXED, parentKey: 'ASSETS' },
  { stableKey: 'LIABILITIES', code: '2000', arabicName: 'الالتزامات', englishName: 'Liabilities', accountType: AccountingAccountType.LIABILITY_CURRENT, allowDirectPosting: false },
  { stableKey: 'AP_CONTROL', code: '2100', arabicName: 'الموردون', englishName: 'Accounts Payable', accountType: AccountingAccountType.LIABILITY_PAYABLE, parentKey: 'LIABILITIES', allowDirectPosting: false, isControlAccount: true, reconciliationEligible: true, systemKey: 'AP_CONTROL' },
  { stableKey: 'TAX_PAYABLE', code: '2200', arabicName: 'ضرائب مستحقة', englishName: 'Tax Payable', accountType: AccountingAccountType.LIABILITY_TAX, parentKey: 'LIABILITIES', systemKey: 'TAX_PAYABLE' },
  { stableKey: 'TAX_RECOVERABLE', code: '2210', arabicName: 'ضرائب قابلة للاسترداد', englishName: 'Tax Recoverable', accountType: AccountingAccountType.ASSET_CURRENT, parentKey: 'ASSETS', systemKey: 'TAX_RECOVERABLE' },
  { stableKey: 'OTHER_CURRENT_LIABILITIES', code: '2300', arabicName: 'التزامات متداولة أخرى', englishName: 'Other Current Liabilities', accountType: AccountingAccountType.LIABILITY_CURRENT, parentKey: 'LIABILITIES' },
  { stableKey: 'EQUITY', code: '3000', arabicName: 'حقوق الملكية', englishName: 'Equity', accountType: AccountingAccountType.EQUITY, allowDirectPosting: false },
  { stableKey: 'CAPITAL', code: '3100', arabicName: 'رأس المال', englishName: 'Capital', accountType: AccountingAccountType.EQUITY, parentKey: 'EQUITY' },
  { stableKey: 'RETAINED_EARNINGS', code: '3200', arabicName: 'الأرباح المحتجزة', englishName: 'Retained Earnings', accountType: AccountingAccountType.EQUITY, parentKey: 'EQUITY', systemKey: 'RETAINED_EARNINGS' },
  { stableKey: 'OPENING_BALANCE_EQUITY', code: '3300', arabicName: 'حقوق ملكية الأرصدة الافتتاحية', englishName: 'Opening Balance Equity', accountType: AccountingAccountType.EQUITY, parentKey: 'EQUITY', systemKey: 'OPENING_BALANCE_EQUITY' },
  { stableKey: 'INCOME', code: '4000', arabicName: 'الإيرادات', englishName: 'Income', accountType: AccountingAccountType.INCOME_OPERATING_REVENUE, allowDirectPosting: false },
  { stableKey: 'SALES_REVENUE', code: '4100', arabicName: 'إيرادات المبيعات والخدمات', englishName: 'Sales / Service Revenue', accountType: AccountingAccountType.INCOME_OPERATING_REVENUE, parentKey: 'INCOME', systemKey: 'SALES_REVENUE' },
  { stableKey: 'OTHER_INCOME', code: '4200', arabicName: 'إيرادات أخرى', englishName: 'Other Income', accountType: AccountingAccountType.INCOME_OTHER, parentKey: 'INCOME' },
  { stableKey: 'COGS', code: '5000', arabicName: 'تكلفة المبيعات', englishName: 'Cost of Goods Sold', accountType: AccountingAccountType.EXPENSE_COGS, systemKey: 'COGS' },
  { stableKey: 'OPERATING_EXPENSES', code: '6000', arabicName: 'المصروفات التشغيلية', englishName: 'Operating Expenses', accountType: AccountingAccountType.EXPENSE_OPERATING, allowDirectPosting: false },
  { stableKey: 'SALARIES', code: '6100', arabicName: 'رواتب وأجور', englishName: 'Salaries', accountType: AccountingAccountType.EXPENSE_OPERATING, parentKey: 'OPERATING_EXPENSES' },
  { stableKey: 'RENT', code: '6200', arabicName: 'إيجارات', englishName: 'Rent', accountType: AccountingAccountType.EXPENSE_OPERATING, parentKey: 'OPERATING_EXPENSES' },
  { stableKey: 'UTILITIES', code: '6300', arabicName: 'مرافق', englishName: 'Utilities', accountType: AccountingAccountType.EXPENSE_OPERATING, parentKey: 'OPERATING_EXPENSES' },
  { stableKey: 'TRANSPORTATION', code: '6400', arabicName: 'انتقالات', englishName: 'Transportation', accountType: AccountingAccountType.EXPENSE_OPERATING, parentKey: 'OPERATING_EXPENSES' },
  { stableKey: 'MARKETING', code: '6500', arabicName: 'تسويق', englishName: 'Marketing', accountType: AccountingAccountType.EXPENSE_OPERATING, parentKey: 'OPERATING_EXPENSES' },
  { stableKey: 'MAINTENANCE', code: '6600', arabicName: 'صيانة', englishName: 'Maintenance', accountType: AccountingAccountType.EXPENSE_OPERATING, parentKey: 'OPERATING_EXPENSES' },
  { stableKey: 'PROFESSIONAL_FEES', code: '6700', arabicName: 'أتعاب مهنية', englishName: 'Professional Fees', accountType: AccountingAccountType.EXPENSE_OPERATING, parentKey: 'OPERATING_EXPENSES' },
  { stableKey: 'DEPRECIATION', code: '6800', arabicName: 'إهلاك', englishName: 'Depreciation', accountType: AccountingAccountType.EXPENSE_DEPRECIATION, parentKey: 'OPERATING_EXPENSES' },
  { stableKey: 'DEFAULT_EXPENSE', code: '6900', arabicName: 'مصروفات أخرى', englishName: 'Other Expenses', accountType: AccountingAccountType.EXPENSE_OTHER, parentKey: 'OPERATING_EXPENSES', systemKey: 'DEFAULT_EXPENSE' },
  { stableKey: 'EXCHANGE_GAIN', code: '7100', arabicName: 'أرباح فروق العملة', englishName: 'Exchange Gain', accountType: AccountingAccountType.INCOME_OTHER, systemKey: 'EXCHANGE_GAIN' },
  { stableKey: 'EXCHANGE_LOSS', code: '7200', arabicName: 'خسائر فروق العملة', englishName: 'Exchange Loss', accountType: AccountingAccountType.EXPENSE_OTHER, systemKey: 'EXCHANGE_LOSS' },
  { stableKey: 'ROUNDING', code: '7300', arabicName: 'فروق التقريب', englishName: 'Rounding', accountType: AccountingAccountType.EXPENSE_OTHER, systemKey: 'ROUNDING' },
];

export const seedAccountingTemplates = async (ctx: SeedContext): Promise<void> => {
  const template = await ctx.prisma.accountingTemplate.create({
    data: {
      code: 'EG_STANDARD_V1',
      version: 1,
      countryCode: 'EG',
      name: 'Egypt SME Standard V1',
      description: 'Product accounting template for Egyptian SMEs; not statutory law.',
      defaultCurrencyCode: 'EGP',
      isActive: true,
    },
  });

  const accountIds = new Map<string, string>();
  for (const account of EG_STANDARD_V1_ACCOUNTS) {
    const parentId = account.parentKey ? accountIds.get(account.parentKey) : undefined;
    if (account.parentKey && !parentId) {
      throw new Error(`Missing template parent ${account.parentKey} for ${account.stableKey}`);
    }

    const created = await ctx.prisma.accountingTemplateAccount.create({
      data: {
        templateId: template.id,
        stableKey: account.stableKey,
        code: account.code,
        arabicName: account.arabicName,
        englishName: account.englishName,
        accountType: account.accountType,
        parentId,
        allowDirectPosting: account.allowDirectPosting ?? true,
        isControlAccount: account.isControlAccount ?? false,
        reconciliationEligible: account.reconciliationEligible ?? false,
        systemKey: account.systemKey,
      },
    });
    accountIds.set(account.stableKey, created.id);
  }

  console.log(`[seed] Accounting template ${template.code} v${template.version} seeded with ${accountIds.size} accounts`);
};

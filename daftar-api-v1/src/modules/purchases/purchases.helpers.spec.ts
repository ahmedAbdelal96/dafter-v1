import {
  Prisma,
  PurchaseAccountType,
  SalesDiscountType,
  TaxCalculationMode,
  TaxTreatmentCategory,
} from '@prisma/client';
import { calculateLines } from './purchases.helpers';

describe('purchase helpers', () => {
  const db: any = {
    taxModuleApplicabilityRule: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    taxRate: { findFirst: jest.fn() },
    taxTreatment: { findFirst: jest.fn() },
    taxAccountBinding: { findUnique: jest.fn().mockResolvedValue(null) },
    accountingConfiguration: {
      findUnique: jest.fn().mockResolvedValue({
        accountDefaults: [{ settingKey: 'EXPENSE', accountId: 'expense-1' }],
      }),
    },
    accountingAccount: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'expense-1',
        accountType: 'EXPENSE_OPERATING',
        isActive: true,
      }),
    },
  };

  beforeEach(() => jest.clearAllMocks());

  it('calculates purchase net, discount and gross totals with Decimal arithmetic', async () => {
    const result = await calculateLines(db, 'company-1', [
      {
        description: 'Paper',
        quantity: '2',
        unitPrice: '100',
        discountType: SalesDiscountType.PERCENT,
        discountValue: '10',
        accountType: PurchaseAccountType.EXPENSE,
      },
    ]);
    expect(result.subtotal.toFixed(4)).toBe('200.0000');
    expect(result.discountTotal.toFixed(4)).toBe('20.0000');
    expect(result.taxableBaseTotal.toFixed(4)).toBe('180.0000');
    expect(result.grandTotal.toFixed(4)).toBe('180.0000');
    expect(result.lines[0].expenseAccountId).toBe('expense-1');
  });

  it('applies inclusive input tax and preserves the tax snapshot', async () => {
    db.taxModuleApplicabilityRule.findUnique.mockResolvedValue({
      isEnabled: true,
      defaultRateId: 'rate-1',
      defaultTreatmentId: 'treatment-1',
      defaultRate: null,
      defaultTreatment: null,
    });
    db.taxRate.findFirst.mockResolvedValue({
      id: 'rate-1',
      code: 'VAT14',
      percentage: new Prisma.Decimal('14'),
      treatmentId: 'treatment-1',
    });
    db.taxTreatment.findFirst.mockResolvedValue({
      id: 'treatment-1',
      code: 'STANDARD',
      category: TaxTreatmentCategory.STANDARD,
      calculationMode: TaxCalculationMode.TAX_INCLUSIVE,
    });
    db.taxAccountBinding = {
      findUnique: jest.fn().mockResolvedValue({ inputTaxAccountCode: '1410' }),
    };
    db.accountingAccount.findFirst.mockImplementation(({ where }: any) =>
      where.code === '1410'
        ? {
            id: 'tax-1',
            code: '1410',
            accountType: 'ASSET_CURRENT',
            isActive: true,
          }
        : {
            id: 'expense-1',
            code: '6000',
            accountType: 'EXPENSE_OPERATING',
            isActive: true,
          },
    );
    const result = await calculateLines(db, 'company-1', [
      {
        description: 'Service',
        quantity: '1',
        unitPrice: '114',
        accountType: PurchaseAccountType.EXPENSE,
      },
    ]);
    expect(result.lines[0].taxableBase.toFixed(4)).toBe('100.0000');
    expect(result.lines[0].taxAmount.toFixed(4)).toBe('14.0000');
    expect(result.lines[0].lineTotal.toFixed(4)).toBe('114.0000');
    expect(result.lines[0].tax?.taxInputAccountId).toBe('tax-1');
  });
});

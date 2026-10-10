import { ForbiddenException } from '@nestjs/common';
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
    accountingConfiguration: {
      findUnique: jest.fn().mockResolvedValue({
        accountDefaults: [
          { settingKey: 'EXPENSE', accountId: 'expense-1' },
          { settingKey: 'TAX_RECOVERABLE', accountId: 'tax-1' },
        ],
      }),
    },
    accountingAccount: {
      findFirst: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve(
          where.id === 'tax-1'
            ? {
                id: 'tax-1',
                companyId: 'company-1',
                accountType: 'ASSET_CURRENT',
                isActive: true,
                allowDirectPosting: true,
              }
            : {
                id: 'expense-1',
                companyId: 'company-1',
                accountType: 'EXPENSE_OPERATING',
                isActive: true,
                allowDirectPosting: true,
              },
        ),
      ),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete db.taxDefaultPolicy;
    delete db.user;
  });

  const activeTreatment = (mode = TaxCalculationMode.TAX_INCLUSIVE) => ({
    id: 'treatment-1',
    companyId: 'company-1',
    code: 'STANDARD',
    category: TaxTreatmentCategory.STANDARD,
    calculationMode: mode,
    status: 'ACTIVE',
    effectiveFrom: null,
    effectiveTo: null,
  });

  const activeRate = () => ({
    id: 'rate-1',
    companyId: 'company-1',
    code: 'VAT14',
    percentage: new Prisma.Decimal('14'),
    treatmentId: 'treatment-1',
    status: 'ACTIVE',
    effectiveFrom: null,
    effectiveTo: null,
  });

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

  it('applies inclusive module-default input tax and preserves the typed snapshot', async () => {
    db.taxModuleApplicabilityRule.findUnique.mockResolvedValue({
      isEnabled: true,
      allowOverride: true,
      defaultRate: activeRate(),
      defaultTreatment: activeTreatment(),
    });
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
    expect(result.lines[0].tax?.selectionProvenance).toBe('MODULE_DEFAULT');
  });

  it('denies an explicit purchase tax override without authorization', async () => {
    db.taxModuleApplicabilityRule.findUnique.mockResolvedValue({
      isEnabled: true,
      allowOverride: true,
      defaultRate: null,
      defaultTreatment: null,
    });
    db.taxDefaultPolicy = {
      findUnique: jest.fn().mockResolvedValue({ allowManualOverride: true }),
    };
    db.user = {
      findFirst: jest
        .fn()
        .mockResolvedValue({ role: 'STAFF', permissions: { permissions: {} } }),
    };
    await expect(
      calculateLines(
        db,
        'company-1',
        [
          {
            description: 'Override',
            quantity: '1',
            unitPrice: '100',
            taxTreatmentId: 'treatment-1',
            taxRateId: 'rate-1',
            accountType: PurchaseAccountType.EXPENSE,
          },
        ],
        2,
        { actorUserId: 'staff-1', asOf: new Date('2026-10-10') },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('records an authorized override and ignores the legacy tax binding', async () => {
    db.taxModuleApplicabilityRule.findUnique.mockResolvedValue({
      isEnabled: true,
      allowOverride: true,
      defaultRate: null,
      defaultTreatment: null,
    });
    db.taxDefaultPolicy = {
      findUnique: jest.fn().mockResolvedValue({ allowManualOverride: true }),
    };
    db.user = {
      findFirst: jest
        .fn()
        .mockResolvedValue({ role: 'OWNER', permissions: { permissions: {} } }),
    };
    db.taxRate.findFirst.mockResolvedValue(activeRate());
    db.taxTreatment.findFirst.mockResolvedValue(
      activeTreatment(TaxCalculationMode.TAX_EXCLUSIVE),
    );
    const result = await calculateLines(
      db,
      'company-1',
      [
        {
          description: 'Override',
          quantity: '1',
          unitPrice: '100',
          taxTreatmentId: 'treatment-1',
          taxRateId: 'rate-1',
          taxOverrideReason: 'Contract requires VAT treatment',
          accountType: PurchaseAccountType.EXPENSE,
        },
      ],
      2,
      { actorUserId: 'owner-1', asOf: new Date('2026-10-10') },
    );
    expect(result.lines[0].tax?.selectionProvenance).toBe('EXPLICIT_OVERRIDE');
    expect(result.lines[0].tax?.overrideReasonSnapshot).toBe(
      'Contract requires VAT treatment',
    );
    expect(result.lines[0].tax?.taxInputAccountId).toBe('tax-1');
  });
});

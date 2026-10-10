import 'dotenv/config';

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { SalesPricingService } from './sales-pricing.service';
import { SalesTaxCalculatorService } from './sales-tax-calculator.service';
import { SalesInvoiceService } from './sales-invoice.service';

jest.setTimeout(30_000);

describe('SalesInvoice drafts', () => {
  let prisma: PrismaService;
  let service: SalesInvoiceService;
  let companyId: string;
  let otherCompanyId: string;
  let ownerId: string;
  let customerId: string;
  let bothId: string;
  let supplierOnlyId: string;
  let inactiveId: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL)
      throw new Error('DATABASE_URL is required for Sales integration tests');
    prisma = new PrismaService();
    await prisma.$connect();
    await prisma.currency.upsert({
      where: { code: 'EGP' },
      update: { isActive: true, minorUnitPrecision: 2 },
      create: { code: 'EGP', name: 'Egyptian Pound', minorUnitPrecision: 2 },
    });
    const stamp = Date.now();
    const company = await prisma.company.create({
      data: { name: `B03 Sales ${stamp}`, currencyCode: 'EGP' },
    });
    const other = await prisma.company.create({
      data: { name: `B03 Other ${stamp}`, currencyCode: 'EGP' },
    });
    companyId = company.id;
    otherCompanyId = other.id;
    const owner = await prisma.user.create({
      data: {
        email: `b03-sales-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'Sales Owner',
        companyId,
        role: 'OWNER',
      },
    });
    ownerId = owner.id;

    const customer = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `C-${stamp}`,
        displayName: 'Customer',
        partnerType: 'ORGANIZATION',
      },
    });
    await prisma.customerProfile.create({
      data: { businessPartnerId: customer.id, companyId, isActive: true },
    });
    customerId = customer.id;
    const both = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `B-${stamp}`,
        displayName: 'Both',
        partnerType: 'ORGANIZATION',
      },
    });
    await prisma.customerProfile.create({
      data: { businessPartnerId: both.id, companyId, isActive: true },
    });
    await prisma.supplierProfile.create({
      data: { businessPartnerId: both.id, companyId, isActive: true },
    });
    bothId = both.id;
    const supplier = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `S-${stamp}`,
        displayName: 'Supplier',
        partnerType: 'ORGANIZATION',
      },
    });
    await prisma.supplierProfile.create({
      data: { businessPartnerId: supplier.id, companyId, isActive: true },
    });
    supplierOnlyId = supplier.id;
    const inactive = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `I-${stamp}`,
        displayName: 'Inactive Customer',
        partnerType: 'ORGANIZATION',
        isActive: false,
      },
    });
    await prisma.customerProfile.create({
      data: { businessPartnerId: inactive.id, companyId, isActive: true },
    });
    inactiveId = inactive.id;
    service = new SalesInvoiceService(
      prisma,
      new SalesPricingService(),
      new SalesTaxCalculatorService(),
      new AccountingService(prisma, new PlatformIdempotencyService(prisma)),
      new AccountingReadinessService(prisma),
    );
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const line = {
    description: 'Service',
    quantity: '2',
    unitPrice: '100.00',
    discountType: 'NONE' as const,
    discountValue: '0',
  };

  it('creates a customer draft with server-calculated totals and no GL effect', async () => {
    const draft = await service.createDraft(companyId, ownerId, {
      businessPartnerId: customerId,
      documentDate: new Date('2026-10-10'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [line],
      claimedGrandTotal: '999999',
    });

    expect(draft.status).toBe('DRAFT');
    expect(draft.invoiceNumber).toBeNull();
    expect(draft.grandTotal.toFixed(2)).toBe('200.00');
    expect(draft.lines[0].descriptionSnapshot).toBe('Service');
    expect(draft.paymentSchedule).toHaveLength(1);
    expect(
      await prisma.journalEntry.count({
        where: { companyId, sourceId: draft.id },
      }),
    ).toBe(0);
  });

  it('accepts a partner with both customer and supplier roles', async () => {
    const draft = await service.createDraft(companyId, ownerId, {
      businessPartnerId: bothId,
      documentDate: new Date('2026-10-10'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [line],
    });
    expect(draft.businessPartnerId).toBe(bothId);
  });

  it('rejects a supplier-only partner', async () => {
    await expect(
      service.createDraft(companyId, ownerId, {
        businessPartnerId: supplierOnlyId,
        documentDate: new Date('2026-10-10'),
        currencyCode: 'EGP',
        exchangeRate: '1',
        lines: [line],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an inactive partner', async () => {
    await expect(
      service.createDraft(companyId, ownerId, {
        businessPartnerId: inactiveId,
        documentDate: new Date('2026-10-10'),
        currencyCode: 'EGP',
        exchangeRate: '1',
        lines: [line],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a cross-company partner', async () => {
    await expect(
      service.createDraft(otherCompanyId, ownerId, {
        businessPartnerId: customerId,
        documentDate: new Date('2026-10-10'),
        currencyCode: 'EGP',
        exchangeRate: '1',
        lines: [line],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates and deletes only drafts', async () => {
    const draft = await service.createDraft(companyId, ownerId, {
      businessPartnerId: customerId,
      documentDate: new Date('2026-10-10'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [line],
    });
    const updated = await service.updateDraft(companyId, ownerId, draft.id, {
      ...draftInput(customerId),
      lines: [{ ...line, unitPrice: '150' }],
    });
    expect(updated.grandTotal.toFixed(2)).toBe('300.00');
    await service.deleteDraft(companyId, ownerId, draft.id);
    await expect(service.findOne(companyId, draft.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('supports useful server-side list filters', async () => {
    const result = await service.findAll(companyId, {
      partnerId: customerId,
      status: 'DRAFT',
      search: 'Customer',
    });
    expect(
      result.items.every(
        (item) =>
          item.businessPartnerId === customerId && item.status === 'DRAFT',
      ),
    ).toBe(true);
  });

  it('snapshots the active Sales tax policy and calculates tax server-side', async () => {
    const stamp = Date.now();
    const treatment = await prisma.taxTreatment.create({
      data: {
        companyId,
        code: `VAT-${stamp}`,
        normalizedCode: `VAT-${stamp}`,
        name: 'VAT standard',
        category: 'STANDARD',
        calculationMode: 'TAX_EXCLUSIVE',
      },
    });
    const rate = await prisma.taxRate.create({
      data: {
        companyId,
        treatmentId: treatment.id,
        code: `VAT14-${stamp}`,
        normalizedCode: `VAT14-${stamp}`,
        name: 'VAT 14%',
        percentage: '14',
        isDefault: true,
      },
    });
    await prisma.taxDefaultPolicy.create({
      data: {
        companyId,
        defaultRateId: rate.id,
        defaultTreatmentId: treatment.id,
        defaultCalculationMode: 'TAX_EXCLUSIVE',
      },
    });
    await prisma.taxModuleApplicabilityRule.create({
      data: {
        companyId,
        moduleKey: 'SALES',
        isEnabled: true,
        defaultRateId: rate.id,
        defaultTreatmentId: treatment.id,
      },
    });
    const draft = await service.createDraft(companyId, ownerId, {
      businessPartnerId: customerId,
      documentDate: new Date('2026-10-15'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [line],
    });
    expect(draft.taxTotal.toFixed(2)).toBe('28.00');
    expect(draft.grandTotal.toFixed(2)).toBe('228.00');
    expect(draft.lines[0].taxes[0].rateCodeSnapshot).toBe(`VAT14-${stamp}`);
  });

  function draftInput(partnerId: string) {
    return {
      businessPartnerId: partnerId,
      documentDate: new Date('2026-10-10'),
      currencyCode: 'EGP',
      exchangeRate: '1',
    };
  }
});

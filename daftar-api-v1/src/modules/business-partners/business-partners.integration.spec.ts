import 'dotenv/config';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BusinessPartnerType } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { BusinessPartnersService } from './business-partners.service';

jest.setTimeout(30_000);

describe('B02 BusinessPartner schema foundation', () => {
  let prisma: PrismaService;
  let service: BusinessPartnersService;
  let companyA: { id: string };
  let companyB: { id: string };
  let ownerA: { id: string };

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for B02 integration tests');
    }
    prisma = new PrismaService();
    await prisma.$connect();
    service = new BusinessPartnersService(prisma);
    await prisma.currency.upsert({
      where: { code: 'EGP' },
      update: { isActive: true },
      create: { code: 'EGP', name: 'Egyptian Pound', minorUnitPrecision: 2 },
    });
    const stamp = Date.now();
    companyA = await prisma.company.create({
      data: { name: `B02 Company A ${stamp}`, currencyCode: 'EGP' },
    });
    companyB = await prisma.company.create({
      data: { name: `B02 Company B ${stamp}`, currencyCode: 'EGP' },
    });
    ownerA = await prisma.user.create({
      data: {
        email: `b02-owner-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'B02 Owner',
        companyId: companyA.id,
        role: 'OWNER',
      },
    });
    await prisma.currency.upsert({
      where: { code: 'ZZZ' },
      update: {
        name: 'Inactive test currency',
        minorUnitPrecision: 2,
        isActive: false,
      },
      create: {
        code: 'ZZZ',
        name: 'Inactive test currency',
        minorUnitPrecision: 2,
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    if (companyA?.id)
      await prisma.company.delete({ where: { id: companyA.id } });
    if (companyB?.id)
      await prisma.company.delete({ where: { id: companyB.id } });
    await prisma?.$disconnect();
  });

  it('creates the authoritative partner tables without monetary balance fields', async () => {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'BusinessPartner',
          'CustomerProfile',
          'SupplierProfile',
          'BusinessPartnerAddress',
          'BusinessPartnerContact'
        )
    `;

    expect(tables.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        'BusinessPartner',
        'CustomerProfile',
        'SupplierProfile',
        'BusinessPartnerAddress',
        'BusinessPartnerContact',
      ]),
    );

    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'BusinessPartner'
    `;

    expect(columns.map((row) => row.column_name)).not.toEqual(
      expect.arrayContaining([
        'openingBalance',
        'currentBalance',
        'receivableBalance',
        'payableBalance',
        'availableBalance',
      ]),
    );
  });

  it('creates one authoritative identity with BOTH roles, searches it, and audits the write', async () => {
    const partner = await service.create(companyA.id, ownerA.id, {
      partnerCode: 'B02-BOTH-001',
      partnerType: BusinessPartnerType.ORGANIZATION,
      displayName: 'B02 Both Roles Trading',
      email: 'both@example.test',
      roles: ['CUSTOMER', 'SUPPLIER'],
      customerProfile: { preferredCurrencyCode: 'EGP', creditLimit: '1000.50' },
      supplierProfile: { preferredCurrencyCode: 'EGP' },
    });

    expect(partner.customerProfile?.businessPartnerId).toBe(partner.id);
    expect(partner.supplierProfile?.businessPartnerId).toBe(partner.id);
    expect(partner.customerProfile?.creditLimit?.toString()).toBe('1000.5');

    const listed = await service.findAll(companyA.id, {
      search: 'B02 Both',
      page: 1,
      limit: 10,
    });
    expect(listed.items.map((item) => item.id)).toContain(partner.id);

    const audit = await prisma.auditLog.findFirst({
      where: {
        companyId: companyA.id,
        entityId: partner.id,
        action: 'business-partners.create',
      },
    });
    expect(audit?.metadata).toEqual(
      expect.objectContaining({ roles: ['CUSTOMER', 'SUPPLIER'] }),
    );
  });

  it('rejects duplicate roles, inactive currencies, and cross-tenant addresses', async () => {
    const partner = await prisma.businessPartner.findFirstOrThrow({
      where: { companyId: companyA.id, partnerCode: 'B02-BOTH-001' },
    });
    await expect(
      service.addCustomerProfile(companyA.id, ownerA.id, partner.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);

    const inactiveCode = (
      await prisma.currency.findFirstOrThrow({
        where: { name: 'Inactive test currency' },
      })
    ).code;
    await expect(
      service.updateCustomerProfile(companyA.id, ownerA.id, partner.id, {
        preferredCurrencyCode: inactiveCode,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.addAddress(companyB.id, ownerA.id, partner.id, {
        addressType: 'BILLING',
        line1: 'Cross tenant address',
        countryCode: 'EG',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

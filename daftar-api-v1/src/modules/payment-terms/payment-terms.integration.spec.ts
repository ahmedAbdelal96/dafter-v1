import 'dotenv/config';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessPartnerType,
  PaymentTermLineType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { BusinessPartnersService } from '../business-partners/business-partners.service';
import { PaymentTermsService } from './payment-terms.service';

jest.setTimeout(30_000);

describe('B02 payment terms', () => {
  let prisma: PrismaService;
  let service: PaymentTermsService;
  let partners: BusinessPartnersService;
  let companyA: { id: string };
  let companyB: { id: string };
  let ownerA: { id: string };
  let ownerB: { id: string };

  beforeAll(async () => {
    if (!process.env.DATABASE_URL)
      throw new Error('DATABASE_URL is required for B02 integration tests');
    prisma = new PrismaService();
    await prisma.$connect();
    service = new PaymentTermsService(prisma);
    partners = new BusinessPartnersService(prisma);
    await prisma.currency.upsert({
      where: { code: 'EGP' },
      update: { isActive: true },
      create: { code: 'EGP', name: 'Egyptian Pound', minorUnitPrecision: 2 },
    });
    const stamp = Date.now();
    companyA = await prisma.company.create({
      data: { name: `B02 Terms A ${stamp}`, currencyCode: 'EGP' },
    });
    companyB = await prisma.company.create({
      data: { name: `B02 Terms B ${stamp}`, currencyCode: 'EGP' },
    });
    ownerA = await prisma.user.create({
      data: {
        email: `b02-terms-a-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'Terms Owner A',
        companyId: companyA.id,
        role: 'OWNER',
      },
    });
    ownerB = await prisma.user.create({
      data: {
        email: `b02-terms-b-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'Terms Owner B',
        companyId: companyB.id,
        role: 'OWNER',
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

  it('creates a tenant-scoped term, calculates Decimal schedules, and audits it', async () => {
    const term = await service.create(companyA.id, ownerA.id, {
      code: 'NET-5050',
      name: '50/50 split',
      lines: [
        {
          sequence: 1,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '50',
          dueDays: 0,
        },
        {
          sequence: 2,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: '50',
          dueDays: 30,
        },
      ],
    });
    const schedule = await service.calculate(
      companyA.id,
      term.id,
      '101.01',
      new Date('2026-01-31T00:00:00.000Z'),
    );

    expect(schedule.map((line) => line.amount.toString())).toEqual([
      '50.51',
      '50.5',
    ]);
    expect((await service.findOne(companyA.id, term.id)).lines).toHaveLength(2);
    expect(
      await prisma.auditLog.findFirst({
        where: {
          companyId: companyA.id,
          entityId: term.id,
          action: 'payment-terms.create',
        },
      }),
    ).toBeTruthy();
  });

  it('rejects cross-tenant assignment, inactive terms, and duplicate codes', async () => {
    const term = await service.findOne(
      companyA.id,
      (
        await prisma.paymentTerm.findFirstOrThrow({
          where: { companyId: companyA.id, code: 'NET-5050' },
        })
      ).id,
    );
    const partnerA = await partners.create(companyA.id, ownerA.id, {
      partnerCode: 'TERM-CUST-A',
      partnerType: BusinessPartnerType.ORGANIZATION,
      displayName: 'Terms Customer A',
      roles: ['CUSTOMER'],
    });
    const partnerB = await partners.create(companyB.id, ownerB.id, {
      partnerCode: 'TERM-CUST-B',
      partnerType: BusinessPartnerType.ORGANIZATION,
      displayName: 'Terms Customer B',
      roles: ['CUSTOMER'],
    });

    await expect(
      service.assignCustomer(companyB.id, ownerB.id, partnerB.id, term.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.create(companyA.id, ownerA.id, {
        code: 'NET-5050',
        name: 'Duplicate',
        lines: [
          {
            sequence: 1,
            calculationType: PaymentTermLineType.BALANCE,
            dueDays: 0,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await service.setActive(companyA.id, ownerA.id, term.id, false);
    await expect(
      service.assignCustomer(companyA.id, ownerA.id, partnerA.id, term.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces primitive database schedule checks', async () => {
    const term = await prisma.paymentTerm.create({
      data: { companyId: companyA.id, code: 'DB-CHECK', name: 'DB check' },
    });
    await expect(
      prisma.paymentTermLine.create({
        data: {
          companyId: companyA.id,
          paymentTermId: term.id,
          sequence: 1,
          calculationType: PaymentTermLineType.PERCENT,
          percentage: new Prisma.Decimal(0),
          dueDays: 0,
        },
      }),
    ).rejects.toThrow();
  });
});

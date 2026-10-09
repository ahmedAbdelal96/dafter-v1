import 'reflect-metadata';

import { ConflictException, NotFoundException } from '@nestjs/common';
import { BusinessPartnerType, Prisma } from '@prisma/client';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { BusinessPartnersController } from './business-partners.controller';
import { BusinessPartnersService } from './business-partners.service';

function prismaDouble() {
  const db = {
    businessPartner: {
      create: jest.fn().mockResolvedValue({
        id: 'partner-a',
        displayName: 'ABC Trading',
        customerProfile: { businessPartnerId: 'partner-a' },
        supplierProfile: { businessPartnerId: 'partner-a' },
      }),
      findFirst: jest.fn().mockResolvedValue({ id: 'partner-a' }),
      findFirstOrThrow: jest.fn().mockResolvedValue({
        id: 'partner-a',
        displayName: 'ABC Trading',
        customerProfile: { businessPartnerId: 'partner-a' },
        supplierProfile: { businessPartnerId: 'partner-a' },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    customerProfile: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    supplierProfile: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    businessPartnerAddress: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    businessPartnerContact: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    journalLine: { count: jest.fn().mockResolvedValue(0) },
    openingBalanceLine: { count: jest.fn().mockResolvedValue(0) },
    auditLog: { create: jest.fn() },
    currency: {
      findFirst: jest.fn().mockResolvedValue({ code: 'EGP', isActive: true }),
    },
    paymentTerm: { findFirst: jest.fn() },
    accountingAccount: { findFirst: jest.fn() },
  } as any;

  return {
    prisma: {
      $transaction: jest.fn((work: (tx: unknown) => unknown) => work(db)),
    } as unknown as import('../../database/prisma/prisma.service').PrismaService,
    db,
  };
}

describe('BusinessPartnersService', () => {
  it('creates one identity and supports both customer and supplier roles', async () => {
    const prisma = prismaDouble();
    const service = new BusinessPartnersService(prisma.prisma);

    const partner = await service.create('company-a', 'user-a', {
      partnerCode: 'BP-001',
      partnerType: BusinessPartnerType.ORGANIZATION,
      displayName: 'ABC Trading',
      roles: ['CUSTOMER', 'SUPPLIER'],
    });

    expect(partner.displayName).toBe('ABC Trading');
    expect(partner.customerProfile?.businessPartnerId).toBe(partner.id);
    expect(partner.supplierProfile?.businessPartnerId).toBe(partner.id);
    expect(prisma.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'business-partners.create' }),
      }),
    );
  });

  it('maps duplicate roles, stale updates, and cross-tenant records to domain errors', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
    });
    const duplicatePrisma = prismaDouble();
    duplicatePrisma.db.customerProfile.create.mockRejectedValue(duplicate);
    await expect(
      new BusinessPartnersService(duplicatePrisma.prisma).addCustomerProfile(
        'company-a',
        'user-a',
        'partner-a',
        {},
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const crossTenantPrisma = prismaDouble();
    crossTenantPrisma.db.businessPartner.findFirst.mockResolvedValue(null);
    await expect(
      new BusinessPartnersService(crossTenantPrisma.prisma).addAddress(
        'company-b',
        'user-b',
        'partner-a',
        {
          addressType: 'BILLING',
          line1: 'Other tenant street',
          countryCode: 'EG',
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    const stalePrisma = prismaDouble();
    await expect(
      new BusinessPartnersService(stalePrisma.prisma).update(
        'company-a',
        'user-a',
        'partner-a',
        {
          version: 0,
          displayName: 'Stale',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('declares read and write permissions on the controller routes', () => {
    const routeHandler = (name: string) =>
      Object.getOwnPropertyDescriptor(
        BusinessPartnersController.prototype,
        name,
      )?.value as object;
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, routeHandler('findAll')),
    ).toEqual(['viewPartners']);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, routeHandler('create')),
    ).toEqual(['managePartners']);
  });
});

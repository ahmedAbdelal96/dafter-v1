import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

export const BUSINESS_PARTNER_INCLUDE = {
  customerProfile: {
    include: {
      paymentTerm: true,
      preferredCurrency: true,
      receivableAccount: true,
    },
  },
  supplierProfile: {
    include: {
      paymentTerm: true,
      preferredCurrency: true,
      payableAccount: true,
    },
  },
  addresses: {
    orderBy: [{ isDefault: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  contacts: {
    orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.BusinessPartnerInclude;

@Injectable()
export class BusinessPartnersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(companyId: string, id: string) {
    return this.prisma.businessPartner.findFirst({
      where: { id, companyId },
      include: BUSINESS_PARTNER_INCLUDE,
    });
  }

  findMany(
    companyId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      isActive?: boolean;
    },
  ) {
    const { page, limit, search, isActive } = params;
    const where: Prisma.BusinessPartnerWhereInput = {
      companyId,
      ...(isActive === undefined ? {} : { isActive }),
      ...(search
        ? {
            OR: [
              { partnerCode: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
              { legalName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              {
                taxRegistrationNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction([
      this.prisma.businessPartner.findMany({
        where,
        include: BUSINESS_PARTNER_INCLUDE,
        orderBy: [{ displayName: 'asc' }, { partnerCode: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.businessPartner.count({ where }),
    ]);
  }
}

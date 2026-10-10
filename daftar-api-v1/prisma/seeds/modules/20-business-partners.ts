import { BusinessPartnerType } from '@prisma/client';

import { SeedContext } from '../types';

export const seedBusinessPartners = async (ctx: SeedContext): Promise<void> => {
  for (const tenant of ctx.tenantStates) {
    const partners = [];

    for (let i = 0; i < 8; i += 1) {
      const partner = await ctx.prisma.businessPartner.create({
        data: {
          companyId: tenant.company.id,
          partnerCode: `${tenant.key.toUpperCase()}-BP-${String(i + 1).padStart(3, '0')}`,
          partnerType: i % 3 === 0 ? BusinessPartnerType.ORGANIZATION : BusinessPartnerType.PERSON,
          displayName: `${i < 5 ? 'Demo Customer' : 'Demo Supplier'} ${i + 1}`,
          legalName: `${tenant.company.name} Partner ${i + 1}`,
          phone: `+20 10${String(10000000 + i).slice(-8)}`,
          email: `partner${i + 1}@${tenant.key}.local`,
          isActive: true,
        },
      });

      if (i < 5) {
        await ctx.prisma.customerProfile.create({
          data: {
            businessPartnerId: partner.id,
            companyId: tenant.company.id,
            isActive: true,
          },
        });
      } else {
        await ctx.prisma.supplierProfile.create({
          data: {
            businessPartnerId: partner.id,
            companyId: tenant.company.id,
            isActive: true,
          },
        });
      }
      partners.push(partner);
    }

    tenant.businessPartners = partners;
  }
};

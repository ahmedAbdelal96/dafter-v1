import { PartyType } from '@prisma/client';

import { daysAgo } from '../helpers';
import { SeedContext } from '../types';

export const seedNotificationsAndAudit = async (
  ctx: SeedContext,
): Promise<void> => {
  for (const tenant of ctx.tenantStates) {
    const recentCustomer = tenant.customers[0];
    const recentSupplier = tenant.suppliers[0];

    await ctx.prisma.notification.createMany({
      data: [
        {
          userId: tenant.owner.id,
          companyId: tenant.company.id,
          type: 'customer.created',
          title: 'New customer added',
          body: `${recentCustomer.name} has been added to your customer list.`,
          data: { screen: 'CustomerDetails', customerId: recentCustomer.id },
          createdAt: daysAgo(1),
        },
        {
          userId: tenant.owner.id,
          companyId: tenant.company.id,
          type: 'invoice.overdue',
          title: 'Overdue invoice reminder',
          body: 'There are overdue invoices that require follow-up.',
          data: { screen: 'Invoices', filter: 'overdue' },
          createdAt: daysAgo(2),
        },
        {
          userId: tenant.staffUsers[0].id,
          companyId: tenant.company.id,
          type: 'supplier.balance',
          title: 'Supplier balance updated',
          body: `${recentSupplier.name} balance has changed.`,
          data: { screen: 'Suppliers', supplierId: recentSupplier.id },
          readAt: daysAgo(1),
          createdAt: daysAgo(3),
        },
      ],
    });

    await ctx.prisma.auditLog.createMany({
      data: [
        {
          companyId: tenant.company.id,
          actorUserId: tenant.owner.id,
          action: 'customer.create',
          entityType: 'customer',
          entityId: recentCustomer.id,
          metadata: { source: 'seed' },
          createdAt: daysAgo(3),
        },
        {
          companyId: tenant.company.id,
          actorUserId: tenant.owner.id,
          action: 'invoice.create',
          entityType: 'invoice',
          metadata: { source: 'seed', partyType: PartyType.CUSTOMER },
          createdAt: daysAgo(2),
        },
      ],
    });
  }
};

import { daysAgo } from '../helpers';
import { SeedContext } from '../types';

export const seedNotificationsAndAudit = async (
  ctx: SeedContext,
): Promise<void> => {
  for (const tenant of ctx.tenantStates) {
    const partner = tenant.businessPartners[0];

    await ctx.prisma.notification.createMany({
      data: [
        {
          userId: tenant.owner.id,
          companyId: tenant.company.id,
          type: 'business-partner.created',
          title: 'Business partner added',
          body: `${partner.displayName} has been added to the workspace.`,
          data: { screen: 'BusinessPartnerDetails', businessPartnerId: partner.id },
          createdAt: daysAgo(1),
        },
        {
          userId: tenant.owner.id,
          companyId: tenant.company.id,
          type: 'sales-invoice.posted',
          title: 'Sales invoice posted',
          body: 'A seeded sales invoice was posted through the accounting engine.',
          data: { screen: 'SalesInvoices', filter: 'posted' },
          createdAt: daysAgo(2),
        },
        {
          userId: tenant.staffUsers[0].id,
          companyId: tenant.company.id,
          type: 'journal-entry.posted',
          title: 'Journal entry posted',
          body: 'A journal entry was posted through JournalEntry and JournalLine.',
          data: { screen: 'AccountingJournal' },
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
          action: 'business-partner.create',
          entityType: 'BusinessPartner',
          entityId: partner.id,
          metadata: { source: 'seed' },
          createdAt: daysAgo(3),
        },
        {
          companyId: tenant.company.id,
          actorUserId: tenant.owner.id,
          action: 'sales-invoice.post',
          entityType: 'SalesInvoice',
          metadata: { source: 'seed', accountingAuthority: 'JournalEntry/JournalLine' },
          createdAt: daysAgo(2),
        },
      ],
    });
  }
};

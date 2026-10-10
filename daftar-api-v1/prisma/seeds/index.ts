import { SeedContext } from './types';
import { resetDatabase } from './modules/00-reset';
import { seedPlatformAndTenants } from './modules/10-platform-tenants';
import { seedAccountingTemplates } from './modules/15-accounting-templates';
import { seedBusinessPartners } from './modules/20-business-partners';
import { seedProducts } from './modules/30-products';
import { seedSalesAndAccounting } from './modules/40-sales-accounting';
import { seedNotificationsAndAudit } from './modules/80-notifications-audit';

const logStep = (text: string): void => {
  console.log(`\n[seed] ${text}`);
};

export const runAllSeeds = async (ctx: SeedContext): Promise<void> => {
  logStep('Reset database');
  await resetDatabase(ctx);

  logStep('Seed accounting templates');
  await seedAccountingTemplates(ctx);

  logStep('Seed platform + tenants + users');
  await seedPlatformAndTenants(ctx);

  logStep('Seed authoritative BusinessPartner records');
  await seedBusinessPartners(ctx);

  logStep('Seed products catalog');
  await seedProducts(ctx);

  logStep('Seed authoritative SalesInvoice + JournalEntry + JournalLine');
  await seedSalesAndAccounting(ctx);

  logStep('Seed notifications + audit logs');
  await seedNotificationsAndAudit(ctx);

  console.log('\n[seed] Completed successfully.');
  console.log('[seed] Login credentials:');
  console.log(
    `  - superadmin@daftar.com / ${ctx.passwords.superAdminPassword.plain}`,
  );
  console.log(`  - owner@daftar.com / ${ctx.passwords.defaultPassword.plain}`);
  console.log(`  - owner2@daftar.com / ${ctx.passwords.defaultPassword.plain}`);
};

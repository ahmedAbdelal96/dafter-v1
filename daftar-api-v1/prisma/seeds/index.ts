import { SeedContext } from './types';
import { resetDatabase } from './modules/00-reset';
import { seedPlatformAndTenants } from './modules/10-platform-tenants';
import { seedPartiesAndBalances } from './modules/20-parties-balances';
import { seedProducts } from './modules/30-products';
import { seedLedger } from './modules/40-ledger';
import { seedDeferredSalesAndInstallments } from './modules/50-deferred-installments';
import { seedExpenses } from './modules/60-expenses';
import { seedInvoices } from './modules/70-invoices';
import { seedNotificationsAndAudit } from './modules/80-notifications-audit';

const logStep = (text: string): void => {
  console.log(`\n[seed] ${text}`);
};

export const runAllSeeds = async (ctx: SeedContext): Promise<void> => {
  logStep('Reset database');
  await resetDatabase(ctx);

  logStep('Seed platform + tenants + users');
  await seedPlatformAndTenants(ctx);

  logStep('Seed parties + opening balances');
  await seedPartiesAndBalances(ctx);

  logStep('Seed products catalog');
  await seedProducts(ctx);

  logStep('Seed ledger baseline activity');
  await seedLedger(ctx);

  logStep('Seed deferred sales + installments');
  await seedDeferredSalesAndInstallments(ctx);

  logStep('Seed expenses');
  await seedExpenses(ctx);

  logStep('Seed invoices + invoice items');
  await seedInvoices(ctx);

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

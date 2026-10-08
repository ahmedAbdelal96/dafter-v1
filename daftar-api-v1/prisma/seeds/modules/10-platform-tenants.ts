import {
  BillingCycle,
  PaymentStatus,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { DEFAULT_ENTERPRISE_FEATURES } from '../../../src/common/entitlements/feature-catalog';
import { TENANT_BLUEPRINTS } from '../data';
import { daysAgo, daysFromNow } from '../helpers';
import { SeedContext, TenantSeedState } from '../types';

export const seedPlatformAndTenants = async (
  ctx: SeedContext,
): Promise<void> => {
  const [defaultPasswordHash, superAdminPasswordHash] = await Promise.all([
    bcrypt.hash(ctx.passwords.defaultPassword.plain, 10),
    bcrypt.hash(ctx.passwords.superAdminPassword.plain, 10),
  ]);

  ctx.passwords.defaultPassword.hash = defaultPasswordHash;
  ctx.passwords.superAdminPassword.hash = superAdminPasswordHash;

  ctx.plan = await ctx.prisma.plan.create({
    data: {
      name: 'Daftar Professional',
      price: 299,
      currencyCode: 'EGP',
      billingCycle: BillingCycle.MONTHLY,
      maxUsers: 25,
      maxCustomers: 4000,
      maxSuppliers: 2000,
      maxEmployees: 1000,
      maxLedgerEntries: BigInt(750000),
      // Use the canonical FeatureKey enum values — must match what FeatureGuard checks
      features: [...DEFAULT_ENTERPRISE_FEATURES],
      isActive: true,
    },
  });

  ctx.superAdmin = await ctx.prisma.user.create({
    data: {
      email: 'superadmin@daftar.com',
      passwordHash: superAdminPasswordHash,
      fullName: 'Daftar Super Admin',
      role: UserRole.SUPER_ADMIN,
    },
  });

  for (const blueprint of TENANT_BLUEPRINTS) {
    const company = await ctx.prisma.company.create({
      data: {
        name: blueprint.companyName,
        phone: blueprint.companyPhone,
        address: blueprint.companyAddress,
        currencyCode: 'EGP',
        isActive: true,
        cashReconciliationMode: blueprint.cashReconciliationMode ?? 'DISABLED',
      },
    });

    const owner = await ctx.prisma.user.create({
      data: {
        email: blueprint.ownerEmail,
        passwordHash: defaultPasswordHash,
        fullName: blueprint.ownerName,
        phone: blueprint.ownerPhone,
        role: UserRole.OWNER,
        companyId: company.id,
      },
    });

    const staffUsers: Awaited<ReturnType<typeof ctx.prisma.user.create>>[] = [];
    for (const member of blueprint.staff) {
      const staffUser = await ctx.prisma.user.create({
        data: {
          email: member.email,
          passwordHash: defaultPasswordHash,
          fullName: member.fullName,
          phone: member.phone,
          role: UserRole.STAFF,
          companyId: company.id,
          permissions: {
            create: {
              permissions: {
                viewParties: true,
                manageParties: member.canManageParties,
                viewLedger: true,
                manageLedger: member.canManageLedger,
                viewReports: member.canViewReports,
                manageUsers: false,
              },
            },
          },
        },
      });

      staffUsers.push(staffUser);
    }

    const subscription = await ctx.prisma.companySubscription.create({
      data: {
        companyId: company.id,
        planId: ctx.plan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: daysAgo(20),
        endDate: daysFromNow(40),
        autoRenew: true,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    await ctx.prisma.subscriptionPayment.create({
      data: {
        companyId: company.id,
        subscriptionId: subscription.id,
        amount: 299,
        currencyCode: 'EGP',
        paymentMethod: 'Bank transfer',
        paymentRef: `SUB-${blueprint.key.toUpperCase()}-001`,
        paymentDate: daysAgo(20),
        status: PaymentStatus.PAID,
      },
    });

    const tenantState: TenantSeedState = {
      key: blueprint.key,
      company,
      owner,
      staffUsers,
      customers: [],
      suppliers: [],
      employees: [],
      products: [],
      deferredSales: [],
      installmentContracts: [],
    };

    ctx.tenantStates.push(tenantState);
  }
};

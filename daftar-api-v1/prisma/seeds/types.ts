import {
  BusinessPartner,
  Company,
  Plan,
  Product,
  User,
} from '@prisma/client';
import { PrismaClient } from '@prisma/client';

export type SeedPassword = {
  plain: string;
  hash: string;
};

export type TenantBlueprint = {
  key: string;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  cashReconciliationMode?: 'DISABLED' | 'SIMPLE_DAILY';
  staff: Array<{
    fullName: string;
    email: string;
    phone: string;
    canManageParties: boolean;
    canManageLedger: boolean;
    canViewReports: boolean;
  }>;
};

export type TenantSeedState = {
  key: string;
  company: Company;
  owner: User;
  staffUsers: User[];
  businessPartners: BusinessPartner[];
  employees: never[];
  products: Product[];
};

export type SeedContext = {
  prisma: PrismaClient;
  plan: Plan | null;
  superAdmin: User | null;
  tenantStates: TenantSeedState[];
  passwords: {
    defaultPassword: SeedPassword;
    superAdminPassword: SeedPassword;
  };
};

export const createSeedContext = (prisma: PrismaClient): SeedContext => ({
  prisma,
  plan: null,
  superAdmin: null,
  tenantStates: [],
  passwords: {
    defaultPassword: { plain: 'owner123', hash: '' },
    superAdminPassword: { plain: 'superadmin123', hash: '' },
  },
});

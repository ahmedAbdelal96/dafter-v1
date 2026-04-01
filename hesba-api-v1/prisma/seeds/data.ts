import { TenantBlueprint } from './types';

export const TENANT_BLUEPRINTS: TenantBlueprint[] = [
  {
    key: 'alpha-traders',
    companyName: 'Alpha Traders',
    companyPhone: '+20 100 100 1001',
    companyAddress: 'Mansoura - Dakahlia',
    ownerName: 'Ahmed Abdallah',
    ownerEmail: 'owner@daftar.com',
    ownerPhone: '+20 100 100 1111',
    cashReconciliationMode: 'SIMPLE_DAILY',
    staff: [
      {
        fullName: 'Sara Ali',
        email: 'staff1@daftar.com',
        phone: '+20 100 100 2222',
        canManageParties: true,
        canManageLedger: true,
        canViewReports: true,
      },
      {
        fullName: 'Mohamed Khaled',
        email: 'staff2@daftar.com',
        phone: '+20 100 100 3333',
        canManageParties: false,
        canManageLedger: false,
        canViewReports: false,
      },
    ],
  },
  {
    key: 'delta-wholesale',
    companyName: 'Delta Wholesale Hub',
    companyPhone: '+20 100 200 1001',
    companyAddress: 'Tanta - Gharbia',
    ownerName: 'Yousef Samir',
    ownerEmail: 'owner2@daftar.com',
    ownerPhone: '+20 100 200 1111',
    cashReconciliationMode: 'SIMPLE_DAILY',
    staff: [
      {
        fullName: 'Mona Nabil',
        email: 'staff3@daftar.com',
        phone: '+20 100 200 2222',
        canManageParties: true,
        canManageLedger: true,
        canViewReports: false,
      },
      {
        fullName: 'Omar Gamal',
        email: 'staff4@daftar.com',
        phone: '+20 100 200 3333',
        canManageParties: true,
        canManageLedger: false,
        canViewReports: true,
      },
    ],
  },
];

import { PartyType } from '@prisma/client';

import { toMoney } from '../helpers';
import { SeedContext } from '../types';

const CUSTOMER_FIRST_NAMES = [
  'Ahmed',
  'Youssef',
  'Mariam',
  'Fatma',
  'Kareem',
  'Nour',
  'Ali',
  'Hana',
  'Mahmoud',
  'Reem',
];

const CUSTOMER_LAST_NAMES = [
  'Abdallah',
  'Hassan',
  'Ibrahim',
  'Mostafa',
  'Samir',
  'Gamal',
  'Farag',
  'Saber',
  'Nabil',
  'Tarek',
];

const CITY_NAMES = [
  'Cairo',
  'Giza',
  'Mansoura',
  'Tanta',
  'Alexandria',
  'Sohag',
  'Assiut',
  'Damietta',
  'Zagazig',
  'Ismailia',
];

const SUPPLIER_NAMES = [
  'Nile Food Supply',
  'Delta Distribution',
  'Golden Dairy Co',
  'Fresh Beverage Factory',
  'Alwadi Household Supplies',
  'Prime Packaging',
  'Smart Retail Supply',
  'Eastern Grains',
  'Clean Care Chemicals',
  'Egypt Oils & Fats',
];

const EMPLOYEE_ROLES = [
  'Cashier',
  'Warehouse Assistant',
  'Accountant',
  'Delivery Driver',
  'Sales Coordinator',
  'Operations Specialist',
  'Supervisor',
  'Store Keeper',
];

export const seedPartiesAndBalances = async (
  ctx: SeedContext,
): Promise<void> => {
  for (const tenant of ctx.tenantStates) {
    const customers: Awaited<ReturnType<typeof ctx.prisma.customer.create>>[] =
      [];
    for (let i = 0; i < 35; i += 1) {
      const first = CUSTOMER_FIRST_NAMES[i % CUSTOMER_FIRST_NAMES.length];
      const last = CUSTOMER_LAST_NAMES[(i + 3) % CUSTOMER_LAST_NAMES.length];
      const city = CITY_NAMES[i % CITY_NAMES.length];

      const openingBalance = toMoney((i % 5 === 0 ? -1 : 1) * (250 + i * 137));
      const creditLimit = toMoney(5000 + i * 300);

      const customer = await ctx.prisma.customer.create({
        data: {
          companyId: tenant.company.id,
          name: `${first} ${last}`,
          phone: `+20 10${(10000000 + i).toString().slice(-8)}`,
          address: `${city} - Street ${i + 1}`,
          openingBalance,
          creditLimit,
          isActive: i % 11 !== 0,
        },
      });

      customers.push(customer);
    }

    const suppliers: Awaited<ReturnType<typeof ctx.prisma.supplier.create>>[] =
      [];
    for (let i = 0; i < 18; i += 1) {
      const supplier = await ctx.prisma.supplier.create({
        data: {
          companyId: tenant.company.id,
          name: `${SUPPLIER_NAMES[i % SUPPLIER_NAMES.length]} ${i + 1}`,
          phone: `+20 12${(20000000 + i).toString().slice(-8)}`,
          address: `${CITY_NAMES[(i + 2) % CITY_NAMES.length]} - Industrial Zone ${i + 1}`,
          openingBalance: toMoney(1000 + i * 550),
          isActive: i % 9 !== 0,
        },
      });

      suppliers.push(supplier);
    }

    const employees: Awaited<ReturnType<typeof ctx.prisma.employee.create>>[] =
      [];
    for (let i = 0; i < 14; i += 1) {
      const first = CUSTOMER_FIRST_NAMES[(i + 4) % CUSTOMER_FIRST_NAMES.length];
      const last = CUSTOMER_LAST_NAMES[(i + 6) % CUSTOMER_LAST_NAMES.length];

      const employee = await ctx.prisma.employee.create({
        data: {
          companyId: tenant.company.id,
          name: `${first} ${last}`,
          phone: `+20 15${(30000000 + i).toString().slice(-8)}`,
          jobTitle: EMPLOYEE_ROLES[i % EMPLOYEE_ROLES.length],
          openingBalance: toMoney((i % 3 === 0 ? -1 : 1) * (150 + i * 80)),
          isActive: i % 10 !== 0,
        },
      });

      employees.push(employee);
    }

    tenant.customers = customers;
    tenant.suppliers = suppliers;
    tenant.employees = employees;

    const balanceRows = [
      ...customers.map((customer) => ({
        companyId: tenant.company.id,
        partyType: PartyType.CUSTOMER,
        partyId: customer.id,
        balance: customer.openingBalance,
      })),
      ...suppliers.map((supplier) => ({
        companyId: tenant.company.id,
        partyType: PartyType.SUPPLIER,
        partyId: supplier.id,
        balance: supplier.openingBalance,
      })),
      ...employees.map((employee) => ({
        companyId: tenant.company.id,
        partyType: PartyType.EMPLOYEE,
        partyId: employee.id,
        balance: employee.openingBalance,
      })),
    ];

    await ctx.prisma.balance.createMany({ data: balanceRows });
  }
};

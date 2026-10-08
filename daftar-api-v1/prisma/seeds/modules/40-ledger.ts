import {
  LedgerEntryType,
  PartyType,
  Prisma,
  SaleType,
} from '@prisma/client';

import { asDateOnly, daysAgo, pickCycleValue, toMoney } from '../helpers';
import { SeedContext } from '../types';

type LedgerInput = {
  companyId: string;
  partyType: PartyType;
  partyId: string;
  entryType: LedgerEntryType;
  signedAmount: number;
  entryDate: Date;
  dueDate?: Date;
  note: string;
  createdById: string;
  saleType?: SaleType;
};

const recordLedgerEntry = async (
  tx: Prisma.TransactionClient,
  input: LedgerInput,
): Promise<void> => {
  await tx.ledgerEntry.create({
    data: {
      companyId: input.companyId,
      partyType: input.partyType,
      partyId: input.partyId,
      entryType: input.entryType,
      signedAmount: input.signedAmount,
      entryDate: input.entryDate,
      dueDate: input.dueDate,
      note: input.note,
      createdById: input.createdById,
      saleType: input.saleType,
    },
  });

  await tx.balance.update({
    where: {
      companyId_partyType_partyId: {
        companyId: input.companyId,
        partyType: input.partyType,
        partyId: input.partyId,
      },
    },
    data: {
      balance: {
        increment: input.signedAmount,
      },
    },
  });
};

export const seedLedger = async (ctx: SeedContext): Promise<void> => {
  for (const tenant of ctx.tenantStates) {
    await ctx.prisma.$transaction(async (tx) => {
      const customerActors = [tenant.owner.id, ...tenant.staffUsers.map((s) => s.id)];

      for (let i = 0; i < Math.min(24, tenant.customers.length); i += 1) {
        const customer = tenant.customers[i];
        const actorId = pickCycleValue(customerActors, i);

        const invoiceAmount = toMoney(600 + i * 170);
        const paidAmount = toMoney(invoiceAmount * (0.35 + (i % 3) * 0.2));

        await recordLedgerEntry(tx, {
          companyId: tenant.company.id,
          partyType: PartyType.CUSTOMER,
          partyId: customer.id,
          entryType: LedgerEntryType.INVOICE,
          signedAmount: invoiceAmount,
          entryDate: asDateOnly(daysAgo(65 - i)),
          dueDate: asDateOnly(daysAgo(35 - i)),
          note: `Sales invoice for customer #${i + 1}`,
          createdById: actorId,
          saleType: SaleType.CASH,
        });

        await recordLedgerEntry(tx, {
          companyId: tenant.company.id,
          partyType: PartyType.CUSTOMER,
          partyId: customer.id,
          entryType: LedgerEntryType.PAYMENT,
          signedAmount: -paidAmount,
          entryDate: asDateOnly(daysAgo(25 - (i % 7))),
          note: `Customer partial payment #${i + 1}`,
          createdById: actorId,
          saleType: SaleType.CASH,
        });
      }

      for (let i = 0; i < Math.min(12, tenant.suppliers.length); i += 1) {
        const supplier = tenant.suppliers[i];

        const purchaseAmount = toMoney(1200 + i * 430);
        const paymentAmount = toMoney(purchaseAmount * 0.45);

        await recordLedgerEntry(tx, {
          companyId: tenant.company.id,
          partyType: PartyType.SUPPLIER,
          partyId: supplier.id,
          entryType: LedgerEntryType.INVOICE,
          signedAmount: purchaseAmount,
          entryDate: asDateOnly(daysAgo(54 - i)),
          dueDate: asDateOnly(daysAgo(20 - i)),
          note: `Purchase invoice from supplier #${i + 1}`,
          createdById: tenant.owner.id,
        });

        await recordLedgerEntry(tx, {
          companyId: tenant.company.id,
          partyType: PartyType.SUPPLIER,
          partyId: supplier.id,
          entryType: LedgerEntryType.PAYMENT,
          signedAmount: -paymentAmount,
          entryDate: asDateOnly(daysAgo(12 - (i % 5))),
          note: `Supplier payment #${i + 1}`,
          createdById: tenant.owner.id,
        });
      }

      for (let i = 0; i < Math.min(10, tenant.employees.length); i += 1) {
        const employee = tenant.employees[i];

        const salary = toMoney(2500 + i * 190);

        await recordLedgerEntry(tx, {
          companyId: tenant.company.id,
          partyType: PartyType.EMPLOYEE,
          partyId: employee.id,
          entryType: LedgerEntryType.SALARY_PAYMENT,
          signedAmount: -salary,
          entryDate: asDateOnly(daysAgo(30 + (i % 2))),
          note: `Monthly salary payment #${i + 1}`,
          createdById: tenant.owner.id,
        });

        if (i % 2 === 0) {
          await recordLedgerEntry(tx, {
            companyId: tenant.company.id,
            partyType: PartyType.EMPLOYEE,
            partyId: employee.id,
            entryType: LedgerEntryType.ADVANCE,
            signedAmount: toMoney(300 + i * 50),
            entryDate: asDateOnly(daysAgo(10 + i)),
            note: `Employee advance #${i + 1}`,
            createdById: tenant.owner.id,
          });
        }
      }
    });
  }
};

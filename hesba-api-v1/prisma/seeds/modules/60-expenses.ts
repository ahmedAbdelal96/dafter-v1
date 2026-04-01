import { ExpenseCategory } from '@prisma/client';

import { asDateOnly, daysAgo, pickCycleValue, toMoney } from '../helpers';
import { SeedContext } from '../types';

const CATEGORIES: ExpenseCategory[] = [
  ExpenseCategory.RENT,
  ExpenseCategory.SALARIES,
  ExpenseCategory.UTILITIES,
  ExpenseCategory.SUPPLIES,
  ExpenseCategory.TRANSPORTATION,
  ExpenseCategory.MAINTENANCE,
  ExpenseCategory.MARKETING,
  ExpenseCategory.TAXES,
  ExpenseCategory.OTHER,
];

const PAYMENT_METHODS = ['Cash', 'Bank transfer', 'Cheque', 'Wallet'];

export const seedExpenses = async (ctx: SeedContext): Promise<void> => {
  for (const tenant of ctx.tenantStates) {
    const actors = [tenant.owner.id, ...tenant.staffUsers.map((s) => s.id)];

    for (let i = 0; i < 48; i += 1) {
      const category = pickCycleValue(CATEGORIES, i);
      const supplier = i % 2 === 0 ? pickCycleValue(tenant.suppliers, i) : null;

      await ctx.prisma.expense.create({
        data: {
          companyId: tenant.company.id,
          supplierId: supplier?.id,
          category,
          amount: toMoney(120 + i * 34.75),
          expenseDate: asDateOnly(daysAgo(i % 60)),
          description: `${category} expense #${i + 1}`,
          referenceNumber: `EXP-${tenant.key.slice(0, 3).toUpperCase()}-${(i + 1).toString().padStart(4, '0')}`,
          paymentMethod: pickCycleValue(PAYMENT_METHODS, i),
          notes: `Auto seeded expense row for ${tenant.company.name}`,
          createdById: pickCycleValue(actors, i),
        },
      });
    }
  }
};

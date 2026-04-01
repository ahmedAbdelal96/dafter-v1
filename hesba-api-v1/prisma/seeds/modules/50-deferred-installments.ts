import {
  DeferredSaleStatus,
  InstallmentStatus,
  LedgerEntryType,
  PartyType,
  Prisma,
  SaleType,
  ScheduleStatus,
  ScheduleType,
} from '@prisma/client';

import { asDateOnly, daysAgo, toMoney } from '../helpers';
import { SeedContext } from '../types';

const updateBalance = async (
  tx: Prisma.TransactionClient,
  companyId: string,
  partyType: PartyType,
  partyId: string,
  delta: number,
): Promise<void> => {
  await tx.balance.update({
    where: {
      companyId_partyType_partyId: {
        companyId,
        partyType,
        partyId,
      },
    },
    data: {
      balance: {
        increment: delta,
      },
    },
  });
};

export const seedDeferredSalesAndInstallments = async (
  ctx: SeedContext,
): Promise<void> => {
  for (const tenant of ctx.tenantStates) {
    await ctx.prisma.$transaction(async (tx) => {
      const deferredSales: Awaited<
        ReturnType<typeof tx.deferredSale.create>
      >[] = [];

      for (let i = 0; i < Math.min(6, tenant.customers.length); i += 1) {
        const customer = tenant.customers[i];
        const totalAmount = toMoney(2200 + i * 450);

        const invoiceEntry = await tx.ledgerEntry.create({
          data: {
            companyId: tenant.company.id,
            partyType: PartyType.CUSTOMER,
            partyId: customer.id,
            entryType: LedgerEntryType.INVOICE,
            signedAmount: totalAmount,
            entryDate: asDateOnly(daysAgo(42 - i)),
            dueDate: asDateOnly(daysAgo(8 - i)),
            note: `Deferred sale invoice #${i + 1}`,
            saleType: SaleType.DEFERRED,
            createdById: tenant.owner.id,
          },
        });

        await updateBalance(
          tx,
          tenant.company.id,
          PartyType.CUSTOMER,
          customer.id,
          totalAmount,
        );

        const deferredSale = await tx.deferredSale.create({
          data: {
            companyId: tenant.company.id,
            partyType: PartyType.CUSTOMER,
            partyId: customer.id,
            ledgerEntryId: invoiceEntry.id,
            referenceNumber: `DEF-${new Date().getFullYear()}-${tenant.key.slice(0, 3).toUpperCase()}-${(i + 1).toString().padStart(4, '0')}`,
            description: `Deferred sale contract ${i + 1}`,
            totalAmount,
            dueDate: asDateOnly(daysAgo(8 - i)),
            status: DeferredSaleStatus.PENDING,
            createdById: tenant.owner.id,
          },
        });

        let paidAmount = 0;

        if (i % 3 !== 0) {
          const paymentAmount = toMoney(totalAmount * 0.35);
          const paymentEntry = await tx.ledgerEntry.create({
            data: {
              companyId: tenant.company.id,
              partyType: PartyType.CUSTOMER,
              partyId: customer.id,
              entryType: LedgerEntryType.PAYMENT,
              signedAmount: -paymentAmount,
              entryDate: asDateOnly(daysAgo(4 + i)),
              note: `Deferred sale payment A #${i + 1}`,
              saleType: SaleType.DEFERRED,
              createdById: tenant.owner.id,
            },
          });

          await tx.deferredPayment.create({
            data: {
              companyId: tenant.company.id,
              deferredSaleId: deferredSale.id,
              ledgerEntryId: paymentEntry.id,
              amount: paymentAmount,
              paymentDate: asDateOnly(daysAgo(4 + i)),
              paymentMethod: 'Cash',
              notes: 'Initial payment',
              createdById: tenant.owner.id,
            },
          });

          await updateBalance(
            tx,
            tenant.company.id,
            PartyType.CUSTOMER,
            customer.id,
            -paymentAmount,
          );

          paidAmount += paymentAmount;
        }

        if (i % 4 === 0) {
          const paymentAmount = toMoney(totalAmount * 0.65);
          const paymentEntry = await tx.ledgerEntry.create({
            data: {
              companyId: tenant.company.id,
              partyType: PartyType.CUSTOMER,
              partyId: customer.id,
              entryType: LedgerEntryType.PAYMENT,
              signedAmount: -paymentAmount,
              entryDate: asDateOnly(daysAgo(2)),
              note: `Deferred sale payment B #${i + 1}`,
              saleType: SaleType.DEFERRED,
              createdById: tenant.owner.id,
            },
          });

          await tx.deferredPayment.create({
            data: {
              companyId: tenant.company.id,
              deferredSaleId: deferredSale.id,
              ledgerEntryId: paymentEntry.id,
              amount: paymentAmount,
              paymentDate: asDateOnly(daysAgo(2)),
              paymentMethod: 'Transfer',
              notes: 'Final payment',
              createdById: tenant.owner.id,
            },
          });

          await updateBalance(
            tx,
            tenant.company.id,
            PartyType.CUSTOMER,
            customer.id,
            -paymentAmount,
          );

          paidAmount += paymentAmount;
        }

        const normalizedPaid = toMoney(Math.min(paidAmount, totalAmount));

        await tx.deferredSale.update({
          where: { id: deferredSale.id },
          data: {
            paidAmount: normalizedPaid,
            status:
              normalizedPaid <= 0
                ? DeferredSaleStatus.PENDING
                : normalizedPaid >= totalAmount
                  ? DeferredSaleStatus.PAID
                  : DeferredSaleStatus.PARTIAL,
          },
        });

        deferredSales.push({
          ...deferredSale,
          paidAmount: new Prisma.Decimal(normalizedPaid),
        });
      }

      tenant.deferredSales = deferredSales;

      const installmentContracts: Awaited<
        ReturnType<typeof tx.installmentContract.create>
      >[] = [];

      for (let i = 0; i < Math.min(5, tenant.customers.length); i += 1) {
        const customer = tenant.customers[i + 8];
        const totalAmount = toMoney(4800 + i * 900);
        const downPayment = toMoney(totalAmount * 0.2);
        const financedAmount = toMoney(totalAmount - downPayment);
        const numberOfInstallments = 4 + (i % 3);

        const invoiceEntry = await tx.ledgerEntry.create({
          data: {
            companyId: tenant.company.id,
            partyType: PartyType.CUSTOMER,
            partyId: customer.id,
            entryType: LedgerEntryType.INVOICE,
            signedAmount: financedAmount,
            entryDate: asDateOnly(daysAgo(24 - i)),
            dueDate: asDateOnly(daysAgo(2 - i)),
            note: `Installment contract opening #${i + 1}`,
            saleType: SaleType.INSTALLMENT,
            createdById: tenant.owner.id,
          },
        });

        await updateBalance(
          tx,
          tenant.company.id,
          PartyType.CUSTOMER,
          customer.id,
          financedAmount,
        );

        if (downPayment > 0) {
          await tx.ledgerEntry.create({
            data: {
              companyId: tenant.company.id,
              partyType: PartyType.CUSTOMER,
              partyId: customer.id,
              entryType: LedgerEntryType.PAYMENT,
              signedAmount: -downPayment,
              entryDate: asDateOnly(daysAgo(24 - i)),
              note: `Installment down payment #${i + 1}`,
              saleType: SaleType.INSTALLMENT,
              createdById: tenant.owner.id,
            },
          });

          await updateBalance(
            tx,
            tenant.company.id,
            PartyType.CUSTOMER,
            customer.id,
            -downPayment,
          );
        }

        const contract = await tx.installmentContract.create({
          data: {
            companyId: tenant.company.id,
            partyType: PartyType.CUSTOMER,
            partyId: customer.id,
            ledgerEntryId: invoiceEntry.id,
            contractNumber: `CNT-${new Date().getFullYear()}-${tenant.key.slice(0, 3).toUpperCase()}-${(i + 1).toString().padStart(4, '0')}`,
            description: `Installment sale contract ${i + 1}`,
            totalAmount,
            downPayment,
            paidAmount: downPayment,
            numberOfInstallments,
            scheduleType: ScheduleType.FIXED,
            startDate: asDateOnly(daysAgo(20 - i)),
            status: InstallmentStatus.ACTIVE,
            createdById: tenant.owner.id,
          },
        });

        const perInstallment = toMoney(financedAmount / numberOfInstallments);
        const schedules: Awaited<
          ReturnType<typeof tx.installmentSchedule.create>
        >[] = [];

        for (
          let installmentNo = 1;
          installmentNo <= numberOfInstallments;
          installmentNo += 1
        ) {
          const schedule = await tx.installmentSchedule.create({
            data: {
              companyId: tenant.company.id,
              contractId: contract.id,
              installmentNumber: installmentNo,
              dueDate: asDateOnly(daysAgo(-(installmentNo * 12))),
              amount: perInstallment,
              paidAmount: 0,
              status: ScheduleStatus.PENDING,
            },
          });

          schedules.push(schedule);
        }

        // Pay the first schedule for most contracts.
        if (i % 4 !== 0) {
          const firstSchedule = schedules[0];
          const paymentAmount = toMoney(
            perInstallment * (i % 2 === 0 ? 1 : 0.6),
          );

          const paymentEntry = await tx.ledgerEntry.create({
            data: {
              companyId: tenant.company.id,
              partyType: PartyType.CUSTOMER,
              partyId: customer.id,
              entryType: LedgerEntryType.PAYMENT,
              signedAmount: -paymentAmount,
              entryDate: asDateOnly(daysAgo(1 + i)),
              note: `Installment schedule payment #${i + 1}`,
              saleType: SaleType.INSTALLMENT,
              createdById: tenant.owner.id,
            },
          });

          await tx.installmentPayment.create({
            data: {
              companyId: tenant.company.id,
              contractId: contract.id,
              scheduleId: firstSchedule.id,
              ledgerEntryId: paymentEntry.id,
              amount: paymentAmount,
              paymentDate: asDateOnly(daysAgo(1 + i)),
              paymentMethod: 'Cash',
              notes: 'Seed payment',
              createdById: tenant.owner.id,
            },
          });

          await tx.installmentSchedule.update({
            where: { id: firstSchedule.id },
            data: {
              paidAmount: paymentAmount,
              status:
                paymentAmount >= Number(firstSchedule.amount)
                  ? ScheduleStatus.PAID
                  : ScheduleStatus.PARTIAL,
              paidAt:
                paymentAmount >= Number(firstSchedule.amount)
                  ? asDateOnly(daysAgo(1 + i))
                  : null,
            },
          });

          await tx.installmentContract.update({
            where: { id: contract.id },
            data: {
              paidAmount: {
                increment: paymentAmount,
              },
            },
          });

          await updateBalance(
            tx,
            tenant.company.id,
            PartyType.CUSTOMER,
            customer.id,
            -paymentAmount,
          );
        }

        installmentContracts.push(contract);
      }

      tenant.installmentContracts = installmentContracts;
    });
  }
};

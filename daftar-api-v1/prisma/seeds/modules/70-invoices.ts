import {
  Invoice,
  LedgerEntryType,
  PartyType,
  Prisma,
  SaleType,
} from '@prisma/client';

import { asDateOnly, daysAgo, pickCycleValue, toMoney } from '../helpers';
import { SeedContext } from '../types';

type InvoiceItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: string;
};

const sumItemsTotal = (items: InvoiceItemInput[]): number =>
  toMoney(items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0));

const createInvoiceWithItems = async (
  tx: Prisma.TransactionClient,
  data: {
    companyId: string;
    createdById: string;
    invoiceNumber: string;
    partyType: PartyType;
    partyId: string;
    partyName: string;
    partyPhone?: string | null;
    partyAddress?: string | null;
    issueDate: Date;
    taxAmount: number;
    notes?: string;
    ledgerEntryId?: string;
    deferredSaleId?: string;
    items: InvoiceItemInput[];
  },
): Promise<Invoice> => {
  const itemsSubtotal = sumItemsTotal(data.items);
  const totalAmount = toMoney(itemsSubtotal + data.taxAmount);

  return tx.invoice.create({
    data: {
      companyId: data.companyId,
      createdById: data.createdById,
      invoiceNumber: data.invoiceNumber,
      partyType: data.partyType,
      partyId: data.partyId,
      partyName: data.partyName,
      partyPhone: data.partyPhone,
      partyAddress: data.partyAddress,
      issueDate: data.issueDate,
      taxAmount: data.taxAmount,
      totalAmount,
      notes: data.notes,
      ledgerEntryId: data.ledgerEntryId,
      deferredSaleId: data.deferredSaleId,
      items: {
        create: data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: toMoney(item.quantity * item.unitPrice),
          productId: item.productId,
        })),
      },
    },
  });
};

export const seedInvoices = async (ctx: SeedContext): Promise<void> => {
  for (const tenant of ctx.tenantStates) {
    await ctx.prisma.$transaction(async (tx) => {
      let sequence = 1;

      // Manual invoices: mixed mode (with and without catalog products).
      for (let i = 0; i < 26; i += 1) {
        const customer = tenant.customers[i % tenant.customers.length];
        const issueDate = asDateOnly(daysAgo(55 - i));

        const lineCount = 1 + (i % 3);
        const items: InvoiceItemInput[] = [];

        for (let line = 0; line < lineCount; line += 1) {
          const useCatalogProduct = (i + line) % 2 === 0;
          const product = useCatalogProduct
            ? pickCycleValue(tenant.products, i + line)
            : null;

          if (product) {
            const quantity = toMoney(1 + ((i + line) % 4) * 0.5);
            items.push({
              description: product.name,
              quantity,
              unitPrice: Number(product.unitPrice),
              productId: product.id,
            });
          } else {
            const quantity = toMoney(1 + ((i + line) % 3));
            const unitPrice = toMoney(90 + (i + line) * 12.5);
            items.push({
              description: `Manual line item ${i + 1}-${line + 1}`,
              quantity,
              unitPrice,
            });
          }
        }

        const itemsSubtotal = sumItemsTotal(items);
        const taxAmount = toMoney(itemsSubtotal * 0.14);
        const totalAmount = toMoney(itemsSubtotal + taxAmount);

        const ledgerEntry = await tx.ledgerEntry.create({
          data: {
            companyId: tenant.company.id,
            partyType: PartyType.CUSTOMER,
            partyId: customer.id,
            entryType: LedgerEntryType.INVOICE,
            signedAmount: totalAmount,
            entryDate: issueDate,
            dueDate: asDateOnly(daysAgo(25 - i)),
            note: `Manual invoice #${sequence}`,
            createdById: tenant.owner.id,
            saleType: SaleType.CASH,
          },
        });

        await tx.balance.update({
          where: {
            companyId_partyType_partyId: {
              companyId: tenant.company.id,
              partyType: PartyType.CUSTOMER,
              partyId: customer.id,
            },
          },
          data: {
            balance: {
              increment: totalAmount,
            },
          },
        });

        await createInvoiceWithItems(tx, {
          companyId: tenant.company.id,
          createdById: tenant.owner.id,
          invoiceNumber: `INV-${new Date().getFullYear()}-${tenant.key.slice(0, 3).toUpperCase()}-${sequence.toString().padStart(5, '0')}`,
          partyType: PartyType.CUSTOMER,
          partyId: customer.id,
          partyName: customer.name,
          partyPhone: customer.phone,
          partyAddress: customer.address,
          issueDate,
          taxAmount,
          notes: 'Generated from modular seed (manual/mixed mode)',
          ledgerEntryId: ledgerEntry.id,
          items,
        });

        sequence += 1;
      }

      // One invoice per deferred sale (from backend endpoint behavior).
      for (const sale of tenant.deferredSales) {
        const customer = tenant.customers.find((item) => item.id === sale.partyId);
        if (!customer) continue;

        const items: InvoiceItemInput[] = [
          {
            description: `Deferred sale ${sale.referenceNumber}`,
            quantity: 1,
            unitPrice: Number(sale.totalAmount),
          },
        ];

        await createInvoiceWithItems(tx, {
          companyId: tenant.company.id,
          createdById: tenant.owner.id,
          invoiceNumber: `INV-${new Date().getFullYear()}-${tenant.key.slice(0, 3).toUpperCase()}-${sequence.toString().padStart(5, '0')}`,
          partyType: PartyType.CUSTOMER,
          partyId: customer.id,
          partyName: customer.name,
          partyPhone: customer.phone,
          partyAddress: customer.address,
          issueDate: asDateOnly(daysAgo(7)),
          taxAmount: 0,
          notes: 'Created from deferred sale',
          deferredSaleId: sale.id,
          items,
        });

        sequence += 1;
      }
    });
  }
};

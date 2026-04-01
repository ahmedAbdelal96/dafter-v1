// ============================================================
// StatementsService — Account Statement (B8.x)
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { LedgerEntryType, PartyType, Prisma } from '@prisma/client';
import { TranslationService } from '../../common/services/translation.service';

export interface StatementEntry {
  id: string;
  date: string;
  type: LedgerEntryType;
  note: string | null;
  amount: string;       // always positive magnitude
  direction: 'debit' | 'credit'; // debit = charge to customer, credit = payment received
  runningBalance: string;
  isOverdue: boolean;
  saleType: string | null;
}

@Injectable()
export class StatementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly t: TranslationService,
  ) {}

  async getCustomerStatement(
    companyId: string,
    customerId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    // Validate customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId, isDeleted: false },
      select: { id: true, name: true, phone: true, openingBalance: true },
    });
    if (!customer) {
      throw new NotFoundException(this.t.translate('customers.get.notFound'));
    }

    const fromDate = dateFrom ? new Date(dateFrom) : undefined;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : undefined;
    const today = new Date();

    // Opening balance = all ledger entries for this customer BEFORE dateFrom
    let openingBalance = new Prisma.Decimal(customer.openingBalance);

    if (fromDate) {
      const prior = await this.prisma.ledgerEntry.aggregate({
        where: {
          companyId,
          partyType: PartyType.CUSTOMER,
          partyId: customerId,
          isDeleted: false,
          entryDate: { lt: fromDate },
        },
        _sum: { signedAmount: true },
      });
      openingBalance = openingBalance.add(prior._sum.signedAmount ?? new Prisma.Decimal(0));
    }

    // Fetch entries in the period, ordered by entryDate asc
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        companyId,
        partyType: PartyType.CUSTOMER,
        partyId: customerId,
        isDeleted: false,
        ...(fromDate || toDate
          ? {
              entryDate: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        entryDate: true,
        entryType: true,
        note: true,
        signedAmount: true,
        saleType: true,
        dueDate: true,
      },
    });

    // Build running balance + overdue flag
    let running = new Prisma.Decimal(openingBalance);
    const rows: StatementEntry[] = entries.map((e) => {
      running = running.add(e.signedAmount);

      const amount = e.signedAmount.abs();
      // For CUSTOMER: negative signedAmount = charge (debit), positive = payment (credit)
      const direction: 'debit' | 'credit' = e.signedAmount.isNegative() ? 'debit' : 'credit';

      // Overdue: a debit entry whose dueDate is in the past (or entryDate if no dueDate)
      const effectiveDueDate = e.dueDate ?? e.entryDate;
      const isOverdue =
        direction === 'debit' && effectiveDueDate.getTime() < today.getTime();

      return {
        id: e.id,
        date: e.entryDate.toISOString().slice(0, 10),
        type: e.entryType,
        note: e.note,
        amount: amount.toFixed(2),
        direction,
        runningBalance: running.toFixed(2),
        isOverdue,
        saleType: e.saleType,
      };
    });

    const closingBalance = running;

    return {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      period: {
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
      },
      openingBalance: openingBalance.toFixed(2),
      closingBalance: closingBalance.toFixed(2),
      totalDebits: rows
        .filter((r) => r.direction === 'debit')
        .reduce((s, r) => s + parseFloat(r.amount), 0)
        .toFixed(2),
      totalCredits: rows
        .filter((r) => r.direction === 'credit')
        .reduce((s, r) => s + parseFloat(r.amount), 0)
        .toFixed(2),
      entriesCount: rows.length,
      entries: rows,
    };
  }
}

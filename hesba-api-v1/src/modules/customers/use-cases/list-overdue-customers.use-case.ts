// ============================================================
// Use Case: List Overdue Customers — B7.2 + B7.3
// ============================================================
// Returns customers that have at least one OVERDUE deferred sale,
// sorted by amount or age, with overdue age classification.
//
// Age buckets:
//   < 7 days   → 'current'
//   7–30 days  → 'short'
//   30–90 days → 'medium'
//   > 90 days  → 'long'
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { DeferredSaleStatus, PartyType } from '@prisma/client';

export type OverdueAgeBucket = 'current' | 'short' | 'medium' | 'long';

export interface OverdueCustomerRow {
  customerId: string;
  customerName: string;
  phone: string | null;
  overdueAmount: string;
  overdueCount: number;
  oldestOverdueDays: number;
  ageBucket: OverdueAgeBucket;
}

function classifyAge(days: number): OverdueAgeBucket {
  if (days < 7) return 'current';
  if (days <= 30) return 'short';
  if (days <= 90) return 'medium';
  return 'long';
}

@Injectable()
export class ListOverdueCustomersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    companyId: string,
    sort: 'amount' | 'age' = 'amount',
    limit = 20,
  ): Promise<OverdueCustomerRow[]> {
    // Aggregate overdue deferred sales by customer
    const grouped = await this.prisma.deferredSale.groupBy({
      by: ['partyId'],
      where: {
        companyId,
        isDeleted: false,
        status: DeferredSaleStatus.OVERDUE,
        partyType: PartyType.CUSTOMER,
      },
      _sum: { totalAmount: true, paidAmount: true },
      _count: { _all: true },
      _min: { dueDate: true },
    });

    if (grouped.length === 0) return [];

    const customerIds = grouped.map((g) => g.partyId);

    // Fetch customer details in one query
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, companyId, isDeleted: false },
      select: { id: true, name: true, phone: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const today = new Date();

    const rows: OverdueCustomerRow[] = grouped
      .map((g) => {
        const customer = customerMap.get(g.partyId);
        if (!customer) return null;

        const oldestDueDate = g._min?.dueDate ?? today;
        const diffMs = today.getTime() - oldestDueDate.getTime();
        const oldestOverdueDays = Math.max(0, Math.floor(diffMs / 86_400_000));

        const total = Number(g._sum?.totalAmount ?? 0);
        const paid = Number(g._sum?.paidAmount ?? 0);

        return {
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
          overdueAmount: (total - paid).toFixed(2),
          overdueCount: g._count?._all ?? 0,
          oldestOverdueDays,
          ageBucket: classifyAge(oldestOverdueDays),
        };
      })
      .filter((r): r is OverdueCustomerRow => r !== null);

    // Sort
    if (sort === 'amount') {
      rows.sort((a, b) => parseFloat(b.overdueAmount) - parseFloat(a.overdueAmount));
    } else {
      rows.sort((a, b) => b.oldestOverdueDays - a.oldestOverdueDays);
    }

    return rows.slice(0, limit);
  }
}

// ============================================================
// Use Case: Get Receivables Overview — B7.1
// ============================================================
// Returns a receivables summary:
//   totalReceivables  — APPROVED invoices with remaining balance (UNPAID + PARTIAL)
//   overdueAmount     — sum of remaining on OVERDUE deferred sales
//   dueToday          — invoices with dueDate = today
//   dueThisWeek       — invoices with dueDate within the next 7 days
//   overdueCustomersCount — distinct customers with any overdue deferred sale
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  DeferredSaleStatus,
  InvoicePaymentStatus,
  InvoiceStatus,
  PartyType,
  Prisma,
} from '@prisma/client';

@Injectable()
export class GetReceivablesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    const [
      receivablesAgg,
      overdueAgg,
      dueTodayAgg,
      dueThisWeekAgg,
      overdueCustomersCount,
      pendingInvoicesCount,
    ] = await Promise.all([
      // Total unpaid/partially-paid APPROVED customer invoices
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          isDeleted: false,
          status: InvoiceStatus.APPROVED,
          partyType: PartyType.CUSTOMER,
          invoicePaymentStatus: {
            in: [InvoicePaymentStatus.UNPAID, InvoicePaymentStatus.PARTIAL],
          },
        },
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
      }),

      // Total overdue deferred sales remaining (totalAmount - paidAmount)
      this.prisma.deferredSale.aggregate({
        where: {
          companyId,
          isDeleted: false,
          status: DeferredSaleStatus.OVERDUE,
        },
        _sum: { totalAmount: true, paidAmount: true },
      }),

      // Due today
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          isDeleted: false,
          status: InvoiceStatus.APPROVED,
          partyType: PartyType.CUSTOMER,
          invoicePaymentStatus: {
            in: [InvoicePaymentStatus.UNPAID, InvoicePaymentStatus.PARTIAL],
          },
          dueDate: { gte: today, lte: endOfToday },
        },
        _sum: { totalAmount: true, paidAmount: true },
      }),

      // Due this week (next 7 days including today)
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          isDeleted: false,
          status: InvoiceStatus.APPROVED,
          partyType: PartyType.CUSTOMER,
          invoicePaymentStatus: {
            in: [InvoicePaymentStatus.UNPAID, InvoicePaymentStatus.PARTIAL],
          },
          dueDate: { gte: today, lte: endOfWeek },
        },
        _sum: { totalAmount: true, paidAmount: true },
      }),

      // Count of distinct overdue customers
      this.prisma.deferredSale.groupBy({
        by: ['partyId'],
        where: {
          companyId,
          isDeleted: false,
          status: DeferredSaleStatus.OVERDUE,
          partyType: PartyType.CUSTOMER,
        },
      }).then((rows) => rows.length),

      // Count PENDING_APPROVAL invoices
      this.prisma.invoice.count({
        where: {
          companyId,
          isDeleted: false,
          status: InvoiceStatus.PENDING_APPROVAL,
        },
      }),
    ]);

    const totalAmount = Number(receivablesAgg._sum.totalAmount ?? 0);
    const totalPaid = Number(receivablesAgg._sum.paidAmount ?? 0);
    const totalReceivables = totalAmount - totalPaid;

    const dueTodayAmount =
      Number(dueTodayAgg._sum.totalAmount ?? 0) - Number(dueTodayAgg._sum.paidAmount ?? 0);
    const dueThisWeekAmount =
      Number(dueThisWeekAgg._sum.totalAmount ?? 0) - Number(dueThisWeekAgg._sum.paidAmount ?? 0);

    return {
      totalReceivables: totalReceivables.toFixed(2),
      overdueAmount: (
        Number(overdueAgg._sum.totalAmount ?? 0) - Number(overdueAgg._sum.paidAmount ?? 0)
      ).toFixed(2),
      dueToday: dueTodayAmount.toFixed(2),
      dueThisWeek: dueThisWeekAmount.toFixed(2),
      overdueCustomersCount,
      pendingInvoicesCount,
    };
  }
}

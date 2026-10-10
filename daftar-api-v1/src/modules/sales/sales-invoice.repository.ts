import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SalesInvoiceQuery } from './dto';

export const SALES_INVOICE_INCLUDE = {
  businessPartner: {
    include: { customerProfile: true, supplierProfile: true, addresses: true },
  },
  lines: { include: { taxes: true }, orderBy: { sequence: 'asc' as const } },
  paymentSchedule: { orderBy: { sequence: 'asc' as const } },
  journalEntry: true,
} as const;

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SalesInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOne(db: Db, companyId: string, id: string) {
    return db.salesInvoice.findFirst({
      where: { id, companyId },
      include: SALES_INVOICE_INCLUDE,
    });
  }

  findMany(companyId: string, query: SalesInvoiceQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const where: Prisma.SalesInvoiceWhereInput = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.partnerId ? { businessPartnerId: query.partnerId } : {}),
      ...(query.currencyCode
        ? { transactionCurrencyCode: query.currencyCode }
        : {}),
      ...(query.documentDateFrom || query.documentDateTo
        ? {
            documentDate: {
              ...(query.documentDateFrom
                ? { gte: query.documentDateFrom }
                : {}),
              ...(query.documentDateTo ? { lte: query.documentDateTo } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                invoiceNumber: { contains: query.search, mode: 'insensitive' },
              },
              {
                partnerNameSnapshot: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                partnerCodeSnapshot: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
    return Promise.all([
      this.prisma.salesInvoice.findMany({
        where,
        include: SALES_INVOICE_INCLUDE,
        orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesInvoice.count({ where }),
    ]).then(([items, total]) => ({
      items,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    }));
  }
}

import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SalesCreditNoteQuery } from './dto';

export const SALES_CREDIT_NOTE_INCLUDE = {
  salesInvoice: {
    select: { id: true, invoiceNumber: true, documentDate: true },
  },
  businessPartner: {
    include: { customerProfile: true, supplierProfile: true, addresses: true },
  },
  lines: { include: { taxes: true }, orderBy: { sequence: 'asc' as const } },
  journalEntry: true,
} as const;

@Injectable()
export class SalesCreditNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOne(companyId: string, id: string) {
    return this.prisma.salesCreditNote.findFirst({
      where: { companyId, id },
      include: SALES_CREDIT_NOTE_INCLUDE,
    });
  }

  findMany(companyId: string, query: SalesCreditNoteQuery) {
    const where: Prisma.SalesCreditNoteWhereInput = {
      companyId,
      ...(query.salesInvoiceId ? { salesInvoiceId: query.salesInvoiceId } : {}),
      ...(query.partnerId ? { businessPartnerId: query.partnerId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    return this.prisma.salesCreditNote.findMany({
      where,
      include: SALES_CREDIT_NOTE_INCLUDE,
      orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }],
    });
  }
}

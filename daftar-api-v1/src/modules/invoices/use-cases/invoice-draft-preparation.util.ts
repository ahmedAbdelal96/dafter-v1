import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InvoiceItemDto } from '../dto/create-invoice.dto';
import { InvoicesRepository } from '../invoices.repository';
import { TranslationService } from '../../../common/services/translation.service';

export interface ComputedInvoiceItem {
  productId: string | null;
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  total: Prisma.Decimal;
}

export async function validateDraftItemProducts(
  items: InvoiceItemDto[] | undefined,
  companyId: string,
  repo: InvoicesRepository,
  t: TranslationService,
): Promise<void> {
  if (!items || items.length === 0) return;

  for (const item of items) {
    if (!item.productId) continue;
    const valid = await repo.productBelongsToCompany(item.productId, companyId);
    if (!valid) {
      throw new NotFoundException(
        t.translate('invoices.productNotFound', { sku: item.productId }),
      );
    }
  }
}

export function computeDraftItems(items: InvoiceItemDto[]): ComputedInvoiceItem[] {
  return items.map((item) => {
    const quantity = new Prisma.Decimal(item.quantity);
    const unitPrice = new Prisma.Decimal(item.unitPrice);
    return {
      productId: item.productId ?? null,
      description: item.description,
      quantity,
      unitPrice,
      total: quantity.mul(unitPrice),
    };
  });
}

export function sumItemTotals(items: ComputedInvoiceItem[]): Prisma.Decimal {
  return items.reduce((acc, item) => acc.add(item.total), new Prisma.Decimal(0));
}

export function normalizeIssueDateToUtcStart(issueDate: string): Date {
  const date = new Date(issueDate);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

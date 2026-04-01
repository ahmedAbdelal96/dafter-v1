// ============================================================
// Use Case: Update Invoice Draft — B10.2
// ============================================================
//
// Only DRAFT invoices may be updated.
// Records a diff (before/after) for each item's unitPrice + quantity
// in the AuditLog.diff field.
//
// Steps:
//  1. Fetch invoice — must be DRAFT and belong to companyId
//  2. Validate new productIds (if any) against company
//  3. Snapshot current items for diff
//  4. $transaction:
//     a. Recompute totals server-side
//     b. Replace items + update header
//     c. AuditLog with diff payload
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { InvoicesRepository } from '../invoices.repository';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class UpdateInvoiceUseCase {
  private readonly logger = new Logger(UpdateInvoiceUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(id: string, companyId: string, userId: string, dto: UpdateInvoiceDto) {
    // Step 1: Verify the invoice exists, is DRAFT, and belongs to this company
    const invoice = await this.repo.findOne(id, companyId);
    if (!invoice) {
      throw new NotFoundException(this.t.translate('invoices.notFound'));
    }
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        this.t.translate('invoices.updateOnlyDraft'),
      );
    }

    // Step 2: Validate any new productIds
    if (dto.items) {
      for (const item of dto.items.filter((i) => i.productId)) {
        const valid = await this.repo.productBelongsToCompany(item.productId!, companyId);
        if (!valid) {
          throw new NotFoundException(
            this.t.translate('invoices.productNotFound', { sku: item.productId }),
          );
        }
      }
    }

    // Step 3: Snapshot current items for diff
    const beforeItems = await this.repo.findItemsForDiff(id);

    // Step 4: Atomic transaction
    const updated = await this.repo.withTransaction(undefined, async (tx) => {
      let computedItems:
        | {
            productId?: string | null;
            description: string;
            quantity: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
            total: Prisma.Decimal;
          }[]
        | undefined;

      let totalAmount: Prisma.Decimal | undefined;
      let taxAmount: Prisma.Decimal | undefined;

      if (dto.items) {
        computedItems = dto.items.map((item) => {
          const qty = new Prisma.Decimal(item.quantity);
          const price = new Prisma.Decimal(item.unitPrice);
          return {
            productId: item.productId ?? null,
            description: item.description,
            quantity: qty,
            unitPrice: price,
            total: qty.mul(price),
          };
        });

        const subtotal = computedItems.reduce(
          (acc, i) => acc.add(i.total),
          new Prisma.Decimal(0),
        );
        taxAmount =
          dto.taxAmount !== undefined
            ? new Prisma.Decimal(dto.taxAmount)
            : invoice.taxAmount;
        totalAmount = subtotal.add(taxAmount);
      } else if (dto.taxAmount !== undefined) {
        taxAmount = new Prisma.Decimal(dto.taxAmount);
        totalAmount = invoice.totalAmount.sub(invoice.taxAmount).add(taxAmount);
      }

      const issueDate =
        dto.issueDate ? (() => {
          const d = new Date(dto.issueDate!);
          d.setUTCHours(0, 0, 0, 0);
          return d;
        })() : undefined;

      const result = await this.repo.updateDraft(
        id,
        companyId,
        {
          items: computedItems,
          totalAmount,
          taxAmount,
          issueDate,
          notes: dto.notes,
        },
        tx,
      );

      // Build diff payload
      const afterItems = computedItems ?? beforeItems;
      const diff = {
        before: beforeItems.map((i) => ({
          description: i.description,
          unitPrice: i.unitPrice.toString(),
          quantity: i.quantity.toString(),
        })),
        after: afterItems.map((i) => ({
          description: i.description,
          unitPrice: 'total' in i ? i.unitPrice.toString() : (i as any).unitPrice?.toString(),
          quantity: 'total' in i ? i.quantity.toString() : (i as any).quantity?.toString(),
        })),
      };

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.update',
        entityType: 'Invoice',
        entityId: id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          fieldsChanged: Object.keys(dto).filter((k) => (dto as any)[k] !== undefined),
        },
        diff,
      });

      this.logger.log(`Invoice draft updated: ${id} | actor: ${userId}`);
      return result;
    });

    return updated;
  }
}

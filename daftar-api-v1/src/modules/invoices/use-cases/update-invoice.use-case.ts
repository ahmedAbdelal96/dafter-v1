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
import {
  ComputedInvoiceItem,
  computeDraftItems,
  normalizeIssueDateToUtcStart,
  sumItemTotals,
  validateDraftItemProducts,
} from './invoice-draft-preparation.util';

type ExistingInvoice = NonNullable<
  Awaited<ReturnType<InvoicesRepository['findOne']>>
>;
type ExistingItemForDiff = Awaited<
  ReturnType<InvoicesRepository['findItemsForDiff']>
>[number];

interface InvoiceUpdatePayload {
  items?: ComputedInvoiceItem[];
  totalAmount?: Prisma.Decimal;
  taxAmount?: Prisma.Decimal;
  issueDate?: Date;
  notes?: string | null;
}

interface AuditDiffItem {
  description: string;
  unitPrice: string;
  quantity: string;
}

type DiffSourceItem = Pick<
  ExistingItemForDiff,
  'description' | 'unitPrice' | 'quantity'
>;

const TRACKED_UPDATE_FIELDS: (keyof UpdateInvoiceDto)[] = [
  'items',
  'issueDate',
  'taxAmount',
  'notes',
];

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
    await validateDraftItemProducts(dto.items, companyId, this.repo, this.t);

    // Step 3: Snapshot current items for diff
    const beforeItems = await this.repo.findItemsForDiff(id);

    // Step 4: Atomic transaction
    const updated = await this.repo.withTransaction(undefined, async (tx) => {
      const updatePayload = this.buildUpdatePayload(dto, invoice);

      const result = await this.repo.updateDraft(
        id,
        companyId,
        {
          ...updatePayload,
          notes: dto.notes,
        },
        tx,
      );

      // Build diff payload
      const afterItems: DiffSourceItem[] = updatePayload.items ?? beforeItems;
      const diff = {
        before: beforeItems.map((item) => this.toAuditDiffItem(item)),
        after: afterItems.map((item) => this.toAuditDiffItem(item)),
      };

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'invoice.update',
        entityType: 'Invoice',
        entityId: id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          fieldsChanged: this.getChangedFields(dto),
        },
        diff,
      });

      this.logger.log(`Invoice draft updated: ${id} | actor: ${userId}`);
      return result;
    });

    return updated;
  }

  private buildUpdatePayload(
    dto: UpdateInvoiceDto,
    invoice: ExistingInvoice,
  ): InvoiceUpdatePayload {
    const payload: InvoiceUpdatePayload = {};

    if (dto.items) {
      const computedItems = computeDraftItems(dto.items);
      const subtotal = sumItemTotals(computedItems);
      const taxAmount =
        dto.taxAmount !== undefined
          ? new Prisma.Decimal(dto.taxAmount)
          : invoice.taxAmount;

      payload.items = computedItems;
      payload.taxAmount = taxAmount;
      payload.totalAmount = subtotal.add(taxAmount);
    } else if (dto.taxAmount !== undefined) {
      const taxAmount = new Prisma.Decimal(dto.taxAmount);
      payload.taxAmount = taxAmount;
      payload.totalAmount = invoice.totalAmount.sub(invoice.taxAmount).add(taxAmount);
    }

    if (dto.issueDate) {
      payload.issueDate = normalizeIssueDateToUtcStart(dto.issueDate);
    }

    return payload;
  }

  private toAuditDiffItem(item: DiffSourceItem): AuditDiffItem {
    return {
      description: item.description,
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity.toString(),
    };
  }

  private getChangedFields(dto: UpdateInvoiceDto): (keyof UpdateInvoiceDto)[] {
    return TRACKED_UPDATE_FIELDS.filter((field) => dto[field] !== undefined);
  }
}

// ============================================================
// Use Case: Update Product (تعديل منتج)
// ============================================================
// Steps:
//   1. Verify product exists in this company (404 if not).
//   2. If new SKU provided and changed, verify no conflict (409 if taken).
//   3. Inside $transaction:
//      a. Update product fields.
//      b. Write AuditLog.
// ============================================================

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsRepository, UpdateProductData } from '../products.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { UpdateProductDto } from '../dto';

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    private readonly repo: ProductsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateProductDto,
  ) {
    // ── Step 1: Verify product exists ─────────────────────────────────────
    const existing = await this.repo.findOne(id, companyId);
    if (!existing) {
      throw new NotFoundException(this.t.translate('products.get.notFound'));
    }

    // ── Step 2: SKU uniqueness check (only when SKU changes) ──────────────
    // We only validate if the client explicitly sends a new, non-null sku
    // that differs from the current one, avoiding unnecessary DB queries.
    if (dto.sku !== undefined && dto.sku !== null && dto.sku !== existing.sku) {
      const taken = await this.repo.skuExists(companyId, dto.sku, id);
      if (taken) {
        throw new ConflictException(
          this.t.translate('products.update.skuExists'),
        );
      }
    }

    // ── Step 3: Build update payload ──────────────────────────────────────
    // Only include fields present in the request to enable partial updates.
    const updateData: UpdateProductData = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.sku !== undefined) updateData.sku = dto.sku;       // null clears it
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.unitPrice !== undefined)
      updateData.unitPrice = new Prisma.Decimal(dto.unitPrice);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // ── Step 4: Atomic update + AuditLog ──────────────────────────────────
    const updated = await this.repo.withTransaction(undefined, async (tx) => {
      const result = await this.repo.update(id, companyId, updateData, tx);

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'product.update',
        entityType: 'product',
        entityId: id,
        metadata: { changes: dto as Record<string, unknown> },
      });

      this.logger.log(
        `Product updated: ${id} | actor: ${userId} | changes: ${JSON.stringify(dto)}`,
      );

      return result;
    });

    return updated;
  }
}

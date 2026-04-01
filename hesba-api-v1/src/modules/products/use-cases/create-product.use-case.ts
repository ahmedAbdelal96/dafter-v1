// ============================================================
// Use Case: Create Product (إضافة منتج/خدمة للكتالوج)
// ============================================================
// Steps:
//   1. If SKU is provided, verify it is unique within this company (409 if taken).
//   2. Inside $transaction:
//      a. Create Product row.
//      b. Write AuditLog.
// ============================================================

import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsRepository } from '../products.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { CreateProductDto } from '../dto';

@Injectable()
export class CreateProductUseCase {
  private readonly logger = new Logger(CreateProductUseCase.name);

  constructor(
    private readonly repo: ProductsRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @param companyId  — from JWT (tenant isolation)
   * @param userId     — actor for AuditLog
   * @param dto        — validated request body
   * @throws ConflictException when SKU is already taken in this company
   */
  async execute(companyId: string, userId: string, dto: CreateProductDto) {
    // ── Rule 1: SKU uniqueness ────────────────────────────────────────────
    // Check before the DB write so we can return a translated, user-friendly
    // ConflictException instead of a raw Prisma P2002 unique-constraint error.
    if (dto.sku) {
      const taken = await this.repo.skuExists(companyId, dto.sku);
      if (taken) {
        throw new ConflictException(
          this.t.translate('products.create.skuExists'),
        );
      }
    }

    // ── Rule 2: Atomic create + AuditLog ─────────────────────────────────
    const product = await this.repo.withTransaction(undefined, async (tx) => {
      const created = await this.repo.create(
        {
          companyId,
          createdById: userId,
          name: dto.name,
          description: dto.description,
          sku: dto.sku,
          category: dto.category,
          unit: dto.unit,
          unitPrice: new Prisma.Decimal(dto.unitPrice),
          isActive: dto.isActive ?? true,
        },
        tx,
      );

      await this.repo.createAuditLog(tx, {
        companyId,
        actorUserId: userId,
        action: 'product.create',
        entityType: 'product',
        entityId: created.id,
        metadata: {
          name: dto.name,
          sku: dto.sku ?? null,
          unitPrice: dto.unitPrice.toString(),
        },
      });

      this.logger.log(
        `Product created: ${created.id} | name: "${dto.name}" | sku: ${dto.sku ?? 'N/A'} | actor: ${userId}`,
      );

      return created;
    });

    return product;
  }
}

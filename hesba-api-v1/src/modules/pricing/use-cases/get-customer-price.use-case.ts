// ============================================================
// Use Case: Get Customer Price for a Product
// ============================================================
// B6.3 — Returns custom price if set, then last-sold price,
// then catalog price, indicating which source was used.
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PricingRepository } from '../pricing.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetCustomerPriceUseCase {
  constructor(
    private readonly repo: PricingRepository,
    private readonly prisma: PrismaService,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, customerId: string, productId: string) {
    // Validate customer and product exist and belong to this company
    const [customer, product] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: customerId, companyId, isDeleted: false },
        select: { id: true, name: true },
      }),
      this.prisma.product.findFirst({
        where: { id: productId, companyId, isDeleted: false },
        select: { id: true, name: true, unitPrice: true, sku: true },
      }),
    ]);

    if (!customer) {
      throw new NotFoundException(this.t.translate('customers.get.notFound'));
    }
    if (!product) {
      throw new NotFoundException(this.t.translate('products.get.notFound'));
    }

    const result = await this.repo.resolveSuggestedPrice(companyId, customerId, productId);

    return {
      customerId,
      customerName: customer.name,
      productId,
      productName: product.name,
      productSku: product.sku,
      catalogPrice: product.unitPrice,
      suggestedPrice: result?.price ?? product.unitPrice,
      source: result?.source ?? 'catalog',
    };
  }
}

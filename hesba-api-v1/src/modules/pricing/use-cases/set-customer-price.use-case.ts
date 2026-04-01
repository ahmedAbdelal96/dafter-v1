// ============================================================
// Use Case: Set Customer-Specific Price for a Product (B6.4)
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PricingRepository } from '../pricing.repository';
import { SetCustomerPriceDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class SetCustomerPriceUseCase {
  constructor(
    private readonly repo: PricingRepository,
    private readonly prisma: PrismaService,
    private readonly t: TranslationService,
  ) {}

  async execute(
    companyId: string,
    customerId: string,
    productId: string,
    dto: SetCustomerPriceDto,
    actorId: string,
  ) {
    const [customer, product] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: customerId, companyId, isDeleted: false },
        select: { id: true, name: true },
      }),
      this.prisma.product.findFirst({
        where: { id: productId, companyId, isDeleted: false },
        select: { id: true, name: true, unitPrice: true },
      }),
    ]);

    if (!customer) {
      throw new NotFoundException(this.t.translate('customers.get.notFound'));
    }
    if (!product) {
      throw new NotFoundException(this.t.translate('products.get.notFound'));
    }

    const record = await this.repo.upsert(
      companyId,
      customerId,
      productId,
      dto.price,
      actorId,
    );

    return {
      id: record.id,
      customerId,
      customerName: customer.name,
      productId,
      productName: product.name,
      catalogPrice: product.unitPrice,
      customPrice: record.price,
      updatedBy: record.updatedBy,
      updatedAt: record.updatedAt,
    };
  }
}

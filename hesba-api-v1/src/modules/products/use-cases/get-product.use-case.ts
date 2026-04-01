// ============================================================
// Use Case: Get Product (تفاصيل منتج محدد)
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProductsRepository } from '../products.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetProductUseCase {
  private readonly logger = new Logger(GetProductUseCase.name);

  constructor(
    private readonly repo: ProductsRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * @throws NotFoundException when product doesn't exist or belongs to another company
   */
  async execute(companyId: string, id: string) {
    const product = await this.repo.findOne(id, companyId);

    if (!product) {
      throw new NotFoundException(this.t.translate('products.get.notFound'));
    }

    return product;
  }
}

// ============================================================
// Use Case: Get Invoice (تفاصيل الفاتورة مع البنود)
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InvoicesRepository } from '../invoices.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetInvoiceUseCase {
  private readonly logger = new Logger(GetInvoiceUseCase.name);

  constructor(
    private readonly repo: InvoicesRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * Returns the full invoice including all line-items.
   *
   * @throws NotFoundException - Invoice not found or belongs to another company
   */
  async execute(companyId: string, invoiceId: string) {
    const invoice = await this.repo.findOne(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundException(this.t.translate('invoices.notFound'));
    }
    return invoice;
  }
}

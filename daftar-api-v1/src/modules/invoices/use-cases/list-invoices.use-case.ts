// ============================================================
// Use Case: List Invoices (قائمة الفواتير)
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { InvoicesRepository } from '../invoices.repository';
import { InvoiceQueryDto } from '../dto';

@Injectable()
export class ListInvoicesUseCase {
  private readonly logger = new Logger(ListInvoicesUseCase.name);

  constructor(private readonly repo: InvoicesRepository) {}

  /**
   * Returns a paginated list of invoices for the company.
   * Items are summaries (no line-item details) for performance.
   * Use GetInvoiceUseCase for the full detail with items.
   */
  async execute(companyId: string, query: InvoiceQueryDto) {
    return this.repo.findMany(companyId, query);
  }
}

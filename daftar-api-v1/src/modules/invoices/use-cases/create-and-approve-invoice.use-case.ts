import { Injectable } from '@nestjs/common';
import { CreateInvoiceDto } from '../dto';
import { CreateInvoiceUseCase } from './create-invoice.use-case';
import { ApproveInvoiceUseCase } from './approve-invoice.use-case';
import { GetInvoiceUseCase } from './get-invoice.use-case';

@Injectable()
export class CreateAndApproveInvoiceUseCase {
  constructor(
    private readonly createInvoice: CreateInvoiceUseCase,
    private readonly approveInvoice: ApproveInvoiceUseCase,
    private readonly getInvoice: GetInvoiceUseCase,
  ) {}

  /**
   * Creates the invoice as DRAFT, then immediately approves it when the actor
   * holds approval permission. If approval fails, the draft remains saved.
   */
  async execute(companyId: string, userId: string, dto: CreateInvoiceDto) {
    const created = await this.createInvoice.execute(companyId, userId, dto);
    await this.approveInvoice.execute(companyId, userId, created.id);
    return this.getInvoice.execute(companyId, created.id);
  }
}

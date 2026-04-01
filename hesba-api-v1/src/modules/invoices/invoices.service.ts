// ============================================================
// InvoicesService — Orchestration Layer
// ============================================================
//
// Pure delegation to use cases — zero business logic here.
// This facade keeps the controller thin and lets other modules
// (e.g., Reports) import InvoicesService without knowing internals.
// ============================================================

import { Injectable } from '@nestjs/common';
import {
  CreateInvoiceUseCase,
  CreateAndApproveInvoiceUseCase,
  CreateFromDeferredSaleUseCase,
  ListInvoicesUseCase,
  GetInvoiceUseCase,
  DeleteInvoiceUseCase,
  SubmitInvoiceUseCase,
  ApproveInvoiceUseCase,
  RejectInvoiceUseCase,
  CancelInvoiceUseCase,
  DuplicateInvoiceUseCase,
  RecordInvoicePaymentUseCase,
  DistributePaymentUseCase,
  RecordStandalonePaymentUseCase,
  UpdateInvoiceUseCase,
} from './use-cases';
import {
  CreateInvoiceDto,
  InvoiceQueryDto,
  RecordPaymentDto,
  DistributePaymentDto,
  StandalonePaymentDto,
  UpdateInvoiceDto,
} from './dto';
import { PartyType } from '@prisma/client';
import { InvoicesRepository } from './invoices.repository';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly createUC: CreateInvoiceUseCase,
    private readonly createAndApproveUC: CreateAndApproveInvoiceUseCase,
    private readonly createFromSaleUC: CreateFromDeferredSaleUseCase,
    private readonly listUC: ListInvoicesUseCase,
    private readonly getUC: GetInvoiceUseCase,
    private readonly deleteUC: DeleteInvoiceUseCase,
    private readonly submitUC: SubmitInvoiceUseCase,
    private readonly approveUC: ApproveInvoiceUseCase,
    private readonly rejectUC: RejectInvoiceUseCase,
    private readonly cancelUC: CancelInvoiceUseCase,
    private readonly duplicateUC: DuplicateInvoiceUseCase,
    private readonly recordPaymentUC: RecordInvoicePaymentUseCase,
    private readonly distributeUC: DistributePaymentUseCase,
    private readonly standalonePaymentUC: RecordStandalonePaymentUseCase,
    private readonly updateUC: UpdateInvoiceUseCase,
    private readonly repo: InvoicesRepository,
  ) {}

  create(companyId: string, userId: string, dto: CreateInvoiceDto) {
    return this.createUC.execute(companyId, userId, dto);
  }

  createAndApprove(companyId: string, userId: string, dto: CreateInvoiceDto) {
    return this.createAndApproveUC.execute(companyId, userId, dto);
  }

  createFromDeferredSale(companyId: string, userId: string, saleId: string) {
    return this.createFromSaleUC.execute(companyId, userId, saleId);
  }

  findAll(companyId: string, query: InvoiceQueryDto) {
    return this.listUC.execute(companyId, query);
  }

  findOne(companyId: string, invoiceId: string) {
    return this.getUC.execute(companyId, invoiceId);
  }

  remove(companyId: string, userId: string, invoiceId: string) {
    return this.deleteUC.execute(companyId, userId, invoiceId);
  }

  submit(companyId: string, userId: string, invoiceId: string) {
    return this.submitUC.execute(companyId, userId, invoiceId);
  }

  approve(companyId: string, userId: string, invoiceId: string) {
    return this.approveUC.execute(companyId, userId, invoiceId);
  }

  reject(companyId: string, userId: string, invoiceId: string) {
    return this.rejectUC.execute(companyId, userId, invoiceId);
  }

  cancel(companyId: string, userId: string, invoiceId: string) {
    return this.cancelUC.execute(companyId, userId, invoiceId);
  }

  // B4
  duplicate(companyId: string, userId: string, sourceId: string) {
    return this.duplicateUC.execute(companyId, userId, sourceId);
  }

  getLastInvoicesForCustomer(
    companyId: string,
    customerId: string,
    limit: number,
  ) {
    return this.repo.getLastInvoicesForParty(
      companyId,
      PartyType.CUSTOMER,
      customerId,
      Math.min(limit, 10),
    );
  }

  // B5
  recordInvoicePayment(
    companyId: string,
    userId: string,
    invoiceId: string,
    dto: RecordPaymentDto,
  ) {
    return this.recordPaymentUC.execute(
      companyId,
      userId,
      invoiceId,
      dto.amount,
      dto.note,
    );
  }

  distributePayment(
    companyId: string,
    userId: string,
    dto: DistributePaymentDto,
  ) {
    return this.distributeUC.execute(
      companyId,
      userId,
      dto.customerId,
      dto.amount,
      dto.invoiceIds,
      dto.note,
    );
  }

  recordStandalonePayment(
    companyId: string,
    userId: string,
    dto: StandalonePaymentDto,
  ) {
    return this.standalonePaymentUC.execute(companyId, userId, dto);
  }

  // B10.2 — update DRAFT invoice with diff logging
  updateDraft(
    companyId: string,
    userId: string,
    invoiceId: string,
    dto: UpdateInvoiceDto,
  ) {
    return this.updateUC.execute(invoiceId, companyId, userId, dto);
  }
}

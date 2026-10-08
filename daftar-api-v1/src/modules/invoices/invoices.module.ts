// ============================================================
// InvoicesModule — Wiring
// ============================================================

import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { PaymentsController } from './payments.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { CustomersModule } from '../customers/customers.module';
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

@Module({
  imports: [CustomersModule],
  controllers: [InvoicesController, PaymentsController],
  providers: [
    InvoicesService,
    InvoicesRepository,
    // Core CRUD
    CreateInvoiceUseCase,
    CreateAndApproveInvoiceUseCase,
    CreateFromDeferredSaleUseCase,
    ListInvoicesUseCase,
    GetInvoiceUseCase,
    DeleteInvoiceUseCase,
    // Workflow transitions
    SubmitInvoiceUseCase,
    ApproveInvoiceUseCase,
    RejectInvoiceUseCase,
    CancelInvoiceUseCase,
    // B4 — Repeat/duplicate
    DuplicateInvoiceUseCase,
    // B5 — Payments
    RecordInvoicePaymentUseCase,
    DistributePaymentUseCase,
    RecordStandalonePaymentUseCase,
    // B10.2 — Update draft with diff logging
    UpdateInvoiceUseCase,
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}

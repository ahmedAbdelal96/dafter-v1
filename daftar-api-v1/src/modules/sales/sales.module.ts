import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { SalesCreditNoteController } from './sales-credit-note.controller';
import { SalesCreditNoteRepository } from './sales-credit-note.repository';
import { SalesCreditNoteService } from './sales-credit-note.service';
import { SalesInvoiceController } from './sales-invoice.controller';
import { SalesInvoiceRepository } from './sales-invoice.repository';
import { SalesInvoiceService } from './sales-invoice.service';
import { SalesPricingService } from './sales-pricing.service';
import { SalesTaxCalculatorService } from './sales-tax-calculator.service';

@Module({
  imports: [AccountingModule],
  controllers: [SalesInvoiceController, SalesCreditNoteController],
  providers: [
    SalesInvoiceRepository,
    SalesCreditNoteRepository,
    SalesInvoiceService,
    SalesCreditNoteService,
    SalesPricingService,
    SalesTaxCalculatorService,
  ],
  exports: [SalesInvoiceService, SalesCreditNoteService],
})
export class SalesModule {}

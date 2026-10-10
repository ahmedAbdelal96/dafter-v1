import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { SalesInvoiceController } from './sales-invoice.controller';
import { SalesInvoiceRepository } from './sales-invoice.repository';
import { SalesInvoiceService } from './sales-invoice.service';
import { SalesPricingService } from './sales-pricing.service';
import { SalesTaxCalculatorService } from './sales-tax-calculator.service';

@Module({
  imports: [AccountingModule],
  controllers: [SalesInvoiceController],
  providers: [
    SalesInvoiceRepository,
    SalesInvoiceService,
    SalesPricingService,
    SalesTaxCalculatorService,
  ],
  exports: [SalesInvoiceService],
})
export class SalesModule {}

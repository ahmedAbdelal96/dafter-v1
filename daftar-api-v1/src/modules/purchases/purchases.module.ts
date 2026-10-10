import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { AccountingBootstrapModule } from '../accounting-bootstrap/accounting-bootstrap.module';
import { PaymentTermsModule } from '../payment-terms/payment-terms.module';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { SupplierCreditNoteController } from './supplier-credit-note.controller';
import { SupplierCreditNoteService } from './supplier-credit-note.service';
import { SupplierInvoiceController } from './supplier-invoice.controller';
import { SupplierInvoiceService } from './supplier-invoice.service';

@Module({
  imports: [AccountingModule, AccountingBootstrapModule, PaymentTermsModule],
  controllers: [
    PurchaseOrderController,
    SupplierInvoiceController,
    SupplierCreditNoteController,
  ],
  providers: [
    PurchaseOrderService,
    SupplierInvoiceService,
    SupplierCreditNoteService,
  ],
  exports: [
    PurchaseOrderService,
    SupplierInvoiceService,
    SupplierCreditNoteService,
  ],
})
export class PurchasesModule {}

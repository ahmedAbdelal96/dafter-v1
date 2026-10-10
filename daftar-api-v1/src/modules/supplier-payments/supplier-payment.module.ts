import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { AccountingBootstrapModule } from '../accounting-bootstrap/accounting-bootstrap.module';
import { SupplierPaymentController } from './supplier-payment.controller';
import { APReconciliationService } from './ap-reconciliation.service';
import { SupplierPaymentService } from './supplier-payment.service';

@Module({
  imports: [AccountingModule, AccountingBootstrapModule],
  controllers: [SupplierPaymentController],
  providers: [APReconciliationService, SupplierPaymentService],
  exports: [APReconciliationService, SupplierPaymentService],
})
export class SupplierPaymentModule {}

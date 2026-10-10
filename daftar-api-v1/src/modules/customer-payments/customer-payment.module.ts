import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { AccountingBootstrapModule } from '../accounting-bootstrap/accounting-bootstrap.module';
import { CustomerPaymentController } from './customer-payment.controller';
import { ARReconciliationService } from './ar-reconciliation.service';
import { CustomerPaymentService } from './customer-payment.service';

@Module({
  imports: [AccountingModule, AccountingBootstrapModule],
  controllers: [CustomerPaymentController],
  providers: [ARReconciliationService, CustomerPaymentService],
  exports: [ARReconciliationService, CustomerPaymentService],
})
export class CustomerPaymentModule {}

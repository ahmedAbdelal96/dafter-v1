import { Module } from '@nestjs/common';
import { FinancialReportsController } from './financial-reports.controller';
import { FinancialReportsService } from './financial-reports.service';
import { CustomerPaymentModule } from '../customer-payments/customer-payment.module';
import { SupplierPaymentModule } from '../supplier-payments/supplier-payment.module';

@Module({ imports: [CustomerPaymentModule, SupplierPaymentModule], controllers: [FinancialReportsController], providers: [FinancialReportsService], exports: [FinancialReportsService] })
export class FinancialReportsModule {}

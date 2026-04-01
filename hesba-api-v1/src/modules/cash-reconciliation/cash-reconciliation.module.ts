import { Module } from '@nestjs/common';
import { CashReconciliationController } from './cash-reconciliation.controller';
import { CashReconciliationService } from './cash-reconciliation.service';
import { CashReconciliationRepository } from './cash-reconciliation.repository';

@Module({
  controllers: [CashReconciliationController],
  providers: [CashReconciliationService, CashReconciliationRepository],
})
export class CashReconciliationModule {}


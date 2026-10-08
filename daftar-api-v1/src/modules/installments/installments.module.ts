// ============================================================
// Installments Module — Wiring
// ============================================================

import { Module } from '@nestjs/common';
import { InstallmentsController } from './installments.controller';
import { InstallmentsService } from './installments.service';
import { InstallmentsRepository } from './installments.repository';
import {
  CreateContractUseCase,
  RecordInstallmentPaymentUseCase,
  CancelContractUseCase,
  GetContractUseCase,
  ListContractsUseCase,
  GetScheduleUseCase,
} from './use-cases';

@Module({
  controllers: [InstallmentsController],
  providers: [
    // Core
    InstallmentsService,
    InstallmentsRepository,

    // Use Cases (one per business operation)
    CreateContractUseCase,
    RecordInstallmentPaymentUseCase,
    CancelContractUseCase,
    GetContractUseCase,
    ListContractsUseCase,
    GetScheduleUseCase,
  ],
  exports: [InstallmentsService, InstallmentsRepository],
})
export class InstallmentsModule {}

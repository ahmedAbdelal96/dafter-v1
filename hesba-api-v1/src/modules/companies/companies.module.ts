// ============================================
// Companies Module — Tenant Self-Management
// ============================================

import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './companies.repository';
import { GetMyCompanyUseCase } from './use-cases/get-my-company.use-case';
import { UpdateMyCompanyUseCase } from './use-cases/update-my-company.use-case';
import { GetCashReconciliationModeUseCase } from './use-cases/get-cash-reconciliation-mode.use-case';
import { UpdateCashReconciliationModeUseCase } from './use-cases/update-cash-reconciliation-mode.use-case';

@Module({
  controllers: [CompaniesController],
  providers: [
    CompaniesRepository,
    GetMyCompanyUseCase,
    UpdateMyCompanyUseCase,
    GetCashReconciliationModeUseCase,
    UpdateCashReconciliationModeUseCase,
  ],
})
export class CompaniesModule {}

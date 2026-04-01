// ============================================
// Employees Module — Wiring
// ============================================

import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './employees.repository';
import {
  CreateEmployeeUseCase,
  ListEmployeesUseCase,
  GetEmployeeUseCase,
  UpdateEmployeeUseCase,
  DeleteEmployeeUseCase,
} from './use-cases';

@Module({
  controllers: [EmployeesController],
  providers: [
    // Core
    EmployeesService,
    EmployeesRepository,

    // Use Cases (one per business operation)
    CreateEmployeeUseCase,
    ListEmployeesUseCase,
    GetEmployeeUseCase,
    UpdateEmployeeUseCase,
    DeleteEmployeeUseCase,
  ],
  exports: [EmployeesService, EmployeesRepository],
})
export class EmployeesModule {}

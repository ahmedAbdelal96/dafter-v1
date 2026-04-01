// ============================================
// Employees Service — Orchestration Layer
// ============================================
// Pure delegation to Use Cases. Zero business logic here.
// Provides a single facade for other modules to import.
// ============================================

import { Injectable } from '@nestjs/common';
import {
  CreateEmployeeUseCase,
  ListEmployeesUseCase,
  GetEmployeeUseCase,
  UpdateEmployeeUseCase,
  DeleteEmployeeUseCase,
} from './use-cases';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from './dto';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly createUC: CreateEmployeeUseCase,
    private readonly listUC: ListEmployeesUseCase,
    private readonly getUC: GetEmployeeUseCase,
    private readonly updateUC: UpdateEmployeeUseCase,
    private readonly deleteUC: DeleteEmployeeUseCase,
  ) {}

  create(companyId: string, actorUserId: string, dto: CreateEmployeeDto) {
    return this.createUC.execute(companyId, actorUserId, dto);
  }

  findAll(companyId: string, query: EmployeeQueryDto) {
    return this.listUC.execute(companyId, query);
  }

  findOne(companyId: string, employeeId: string) {
    return this.getUC.execute(companyId, employeeId);
  }

  update(
    companyId: string,
    actorUserId: string,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ) {
    return this.updateUC.execute(companyId, actorUserId, employeeId, dto);
  }

  remove(companyId: string, actorUserId: string, employeeId: string) {
    return this.deleteUC.execute(companyId, actorUserId, employeeId);
  }
}

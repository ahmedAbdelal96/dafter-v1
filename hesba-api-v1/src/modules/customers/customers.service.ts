// ============================================
// Customers Service — Orchestration Layer
// ============================================
// Thin wrapper — delegates to use cases only.
// No business logic here.
//
// Why a service and not direct use-case injection in controller?
//   → Single facade for other modules (e.g. Ledger validates customer exists)
//   → Controller stays thin without importing 5 use cases
// ============================================

import { Injectable } from '@nestjs/common';
import {
  CreateCustomerUseCase,
  ListCustomersUseCase,
  GetCustomerUseCase,
  GetCustomerSnapshotUseCase,
  UpdateCustomerUseCase,
  DeleteCustomerUseCase,
  GetFrequentProductsUseCase,
  ListOverdueCustomersUseCase,
} from './use-cases';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly createUC: CreateCustomerUseCase,
    private readonly listUC: ListCustomersUseCase,
    private readonly getUC: GetCustomerUseCase,
    private readonly snapshotUC: GetCustomerSnapshotUseCase,
    private readonly updateUC: UpdateCustomerUseCase,
    private readonly deleteUC: DeleteCustomerUseCase,
    private readonly frequentProductsUC: GetFrequentProductsUseCase,
    private readonly overdueUC: ListOverdueCustomersUseCase,
  ) {}

  create(companyId: string, actorUserId: string, dto: CreateCustomerDto) {
    return this.createUC.execute(companyId, actorUserId, dto);
  }

  findAll(companyId: string, query: CustomerQueryDto) {
    return this.listUC.execute(companyId, query);
  }

  findOne(companyId: string, customerId: string) {
    return this.getUC.execute(companyId, customerId);
  }

  getSnapshot(companyId: string, customerId: string) {
    return this.snapshotUC.execute(companyId, customerId);
  }

  update(
    companyId: string,
    actorUserId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ) {
    return this.updateUC.execute(companyId, actorUserId, customerId, dto);
  }

  remove(companyId: string, actorUserId: string, customerId: string) {
    return this.deleteUC.execute(companyId, actorUserId, customerId);
  }

  getFrequentProducts(companyId: string, customerId: string, limit: number) {
    return this.frequentProductsUC.execute(companyId, customerId, limit);
  }

  listOverdue(companyId: string, sort: 'amount' | 'age', limit: number) {
    return this.overdueUC.execute(companyId, sort, limit);
  }
}

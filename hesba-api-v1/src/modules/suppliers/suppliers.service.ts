// ============================================
// Suppliers Service — Orchestration Layer
// ============================================
// Thin wrapper — delegates to use cases only.
// No business logic here.
// ============================================

import { Injectable } from '@nestjs/common';
import {
  CreateSupplierUseCase,
  ListSuppliersUseCase,
  GetSupplierUseCase,
  UpdateSupplierUseCase,
  DeleteSupplierUseCase,
} from './use-cases';
import { CreateSupplierDto, UpdateSupplierDto, SupplierQueryDto } from './dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly createUC: CreateSupplierUseCase,
    private readonly listUC: ListSuppliersUseCase,
    private readonly getUC: GetSupplierUseCase,
    private readonly updateUC: UpdateSupplierUseCase,
    private readonly deleteUC: DeleteSupplierUseCase,
  ) {}

  create(companyId: string, actorUserId: string, dto: CreateSupplierDto) {
    return this.createUC.execute(companyId, actorUserId, dto);
  }

  findAll(companyId: string, query: SupplierQueryDto) {
    return this.listUC.execute(companyId, query);
  }

  findOne(companyId: string, supplierId: string) {
    return this.getUC.execute(companyId, supplierId);
  }

  update(
    companyId: string,
    actorUserId: string,
    supplierId: string,
    dto: UpdateSupplierDto,
  ) {
    return this.updateUC.execute(companyId, actorUserId, supplierId, dto);
  }

  remove(companyId: string, actorUserId: string, supplierId: string) {
    return this.deleteUC.execute(companyId, actorUserId, supplierId);
  }
}

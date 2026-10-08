// ============================================
// Suppliers Module — Wiring
// ============================================
// Architecture:
//   Controller → Service → Use Cases → Repository → Prisma
//
// Exports:
//   SuppliersService — used by Ledger module to validate party exists
//   SuppliersRepository — exported for cross-module queries
// ============================================

import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersRepository } from './suppliers.repository';
import {
  CreateSupplierUseCase,
  ListSuppliersUseCase,
  GetSupplierUseCase,
  UpdateSupplierUseCase,
  DeleteSupplierUseCase,
} from './use-cases';

@Module({
  controllers: [SuppliersController],
  providers: [
    // Service layer
    SuppliersService,

    // Data access
    SuppliersRepository,

    // Use Cases (one per business operation — SRP)
    CreateSupplierUseCase,
    ListSuppliersUseCase,
    GetSupplierUseCase,
    UpdateSupplierUseCase,
    DeleteSupplierUseCase,
  ],
  exports: [SuppliersService, SuppliersRepository],
})
export class SuppliersModule {}

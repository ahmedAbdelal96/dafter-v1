// ============================================
// Customers Module — Wiring
// ============================================
// Architecture:
//   Controller → Service → Use Cases → Repository → Prisma
//
// Exports:
//   CustomersService — used by Ledger module to validate party exists
//   CustomersRepository — used internally; exported for cross-module queries
// ============================================

import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersRepository } from './customers.repository';
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

@Module({
  controllers: [CustomersController],
  providers: [
    // Service layer
    CustomersService,

    // Data access
    CustomersRepository,

    // Use Cases (one per business operation — SRP)
    CreateCustomerUseCase,
    ListCustomersUseCase,
    GetCustomerUseCase,
    GetCustomerSnapshotUseCase,
    UpdateCustomerUseCase,
    DeleteCustomerUseCase,
    GetFrequentProductsUseCase,
    ListOverdueCustomersUseCase,
  ],
  exports: [
    // Ledger module needs to validate customer exists before creating entries
    CustomersService,
    CustomersRepository,
    GetCustomerSnapshotUseCase,
  ],
})
export class CustomersModule {}

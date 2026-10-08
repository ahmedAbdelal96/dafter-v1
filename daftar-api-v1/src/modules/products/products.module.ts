// ============================================================
// ProductsModule — wires all products-catalog providers
// ============================================================
//
// Exports ProductsService so that future modules (Phase K: Invoices)
// can import it without coupling to the internal use-case layer.
// ============================================================

import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import {
  CreateProductUseCase,
  ListProductsUseCase,
  GetProductUseCase,
  UpdateProductUseCase,
  DeleteProductUseCase,
  SearchProductsUseCase,
  GetRecentProductsUseCase,
  GetLastPriceUseCase,
} from './use-cases';

@Module({
  controllers: [ProductsController],
  providers: [
    // Core
    ProductsService,
    ProductsRepository,

    // Use Cases (one per business operation — SRP)
    CreateProductUseCase,
    ListProductsUseCase,
    GetProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    SearchProductsUseCase,
    GetRecentProductsUseCase,
    GetLastPriceUseCase,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}

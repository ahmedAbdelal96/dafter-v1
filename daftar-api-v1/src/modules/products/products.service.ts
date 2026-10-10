// ============================================================
// ProductsService — Orchestration Layer (thin facade)
// ============================================================
// No business logic here — all operations are delegated to use cases.
// Exposing a single service keeps the controller thin and gives other
// modules (e.g., Invoices) a stable, importable facade.
// ============================================================

import { Injectable } from '@nestjs/common';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto';
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

@Injectable()
export class ProductsService {
  constructor(
    private readonly createUC: CreateProductUseCase,
    private readonly listUC: ListProductsUseCase,
    private readonly getUC: GetProductUseCase,
    private readonly updateUC: UpdateProductUseCase,
    private readonly deleteUC: DeleteProductUseCase,
    private readonly searchUC: SearchProductsUseCase,
    private readonly recentUC: GetRecentProductsUseCase,
    private readonly lastPriceUC: GetLastPriceUseCase,
  ) {}

  create(companyId: string, userId: string, dto: CreateProductDto) {
    return this.createUC.execute(companyId, userId, dto);
  }

  findAll(companyId: string, query: QueryProductDto) {
    return this.listUC.execute(companyId, query);
  }

  findOne(companyId: string, id: string) {
    return this.getUC.execute(companyId, id);
  }

  update(companyId: string, userId: string, id: string, dto: UpdateProductDto) {
    return this.updateUC.execute(companyId, userId, id, dto);
  }

  remove(companyId: string, userId: string, id: string) {
    return this.deleteUC.execute(companyId, userId, id);
  }

  search(companyId: string, q: string, limit: number) {
    return this.searchUC.execute(companyId, q, limit);
  }

  getRecentProducts(companyId: string, limit: number) {
    return this.recentUC.execute(companyId, limit);
  }

  getLastPrice(companyId: string, productId: string, businessPartnerId: string) {
    return this.lastPriceUC.execute(companyId, productId, businessPartnerId);
  }
}

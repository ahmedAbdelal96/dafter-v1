// ============================================================
// Deferred Sales Module — Wiring
// ============================================================
// يُربط كل مكونات موديول البيوع الآجلة:
//   - Controller: طبقة HTTP النحيفة
//   - Service: التنسيق بين حالات الاستخدام
//   - Repository: طبقة الوصول للبيانات (Prisma)
//   - Use Cases: منطق الأعمال (واحد لكل عملية)
//
// يُصدَّر DeferredSalesService للاستخدام من موديولات أخرى إن لزم.
// ============================================================

import { Module } from '@nestjs/common';
import { DeferredSalesController } from './deferred-sales.controller';
import { DeferredSalesService } from './deferred-sales.service';
import { DeferredSalesRepository } from './deferred-sales.repository';
import {
  CreateDeferredSaleUseCase,
  RecordDeferredPaymentUseCase,
  CancelDeferredSaleUseCase,
  GetDeferredSaleUseCase,
  ListDeferredSalesUseCase,
} from './use-cases';

@Module({
  controllers: [DeferredSalesController],
  providers: [
    // Core
    DeferredSalesService,
    DeferredSalesRepository,

    // Use Cases (one per business operation)
    CreateDeferredSaleUseCase,
    RecordDeferredPaymentUseCase,
    CancelDeferredSaleUseCase,
    GetDeferredSaleUseCase,
    ListDeferredSalesUseCase,
  ],
  exports: [DeferredSalesService],
})
export class DeferredSalesModule {}

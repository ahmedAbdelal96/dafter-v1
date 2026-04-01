// ============================================================
// Expenses Module — Wiring
// ============================================================
// يُربط كل مكونات موديول المصروفات:
//   - Controller: طبقة HTTP النحيفة
//   - Service: التنسيق بين حالات الاستخدام
//   - Repository: طبقة الوصول للبيانات (Prisma)
//   - Use Cases: منطق الأعمال (واحد لكل عملية)
//
// يُصدَّر ExpensesService للاستخدام من موديولات أخرى (مثل Reports).
// ============================================================

import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './expenses.repository';
import {
  CreateExpenseUseCase,
  ListExpensesUseCase,
  GetExpenseUseCase,
  UpdateExpenseUseCase,
  DeleteExpenseUseCase,
  GetExpenseSummaryUseCase,
} from './use-cases';

@Module({
  controllers: [ExpensesController],
  providers: [
    // Core
    ExpensesService,
    ExpensesRepository,

    // Use Cases (one per business operation)
    CreateExpenseUseCase,
    ListExpensesUseCase,
    GetExpenseUseCase,
    UpdateExpenseUseCase,
    DeleteExpenseUseCase,
    GetExpenseSummaryUseCase,
  ],
  exports: [ExpensesService],
})
export class ExpensesModule {}

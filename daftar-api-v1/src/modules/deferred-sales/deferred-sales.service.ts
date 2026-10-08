// ============================================================
// Deferred Sales Service — Pure Orchestration Layer
// ============================================================
// هذا الـ Service هو طبقة التنسيق الوحيدة بين الكنترولر وحالات الاستخدام.
// لا يحتوي على أي منطق تجاري — تفويض كامل للـ Use Cases.
//
// المسؤوليات:
//   - توجيه الطلبات لحالات الاستخدام الصحيحة
//   - توحيد واجهة التفاعل مع الموديول من الخارج
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import {
  CreateDeferredSaleUseCase,
  RecordDeferredPaymentUseCase,
  CancelDeferredSaleUseCase,
  GetDeferredSaleUseCase,
  ListDeferredSalesUseCase,
} from './use-cases';
import {
  CreateDeferredSaleDto,
  RecordDeferredPaymentDto,
  QueryDeferredSaleDto,
} from './dto';

@Injectable()
export class DeferredSalesService {
  private readonly logger = new Logger(DeferredSalesService.name);

  constructor(
    private readonly createDeferredSaleUseCase: CreateDeferredSaleUseCase,
    private readonly recordDeferredPaymentUseCase: RecordDeferredPaymentUseCase,
    private readonly cancelDeferredSaleUseCase: CancelDeferredSaleUseCase,
    private readonly getDeferredSaleUseCase: GetDeferredSaleUseCase,
    private readonly listDeferredSalesUseCase: ListDeferredSalesUseCase,
  ) {}

  /**
   * إنشاء بيع آجل جديد
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param userId - معرف المستخدم المنفّذ
   * @param dto - بيانات البيع الآجل الجديد
   * @returns البيع الآجل المنشأ
   */
  async create(
    companyId: string,
    userId: string,
    dto: CreateDeferredSaleDto,
  ) {
    return this.createDeferredSaleUseCase.execute(companyId, userId, dto);
  }

  /**
   * تسجيل دفعة على بيع آجل
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param userId - معرف المستخدم المنفّذ
   * @param saleId - معرف البيع الآجل
   * @param dto - بيانات الدفعة
   * @returns الدفعة المسجّلة مع البيع الآجل المحدَّث
   */
  async recordPayment(
    companyId: string,
    userId: string,
    saleId: string,
    dto: RecordDeferredPaymentDto,
  ) {
    return this.recordDeferredPaymentUseCase.execute(
      companyId,
      userId,
      saleId,
      dto,
    );
  }

  /**
   * إلغاء بيع آجل
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param userId - معرف المستخدم المنفّذ
   * @param saleId - معرف البيع الآجل
   */
  async cancel(
    companyId: string,
    userId: string,
    saleId: string,
  ): Promise<void> {
    return this.cancelDeferredSaleUseCase.execute(companyId, userId, saleId);
  }

  /**
   * جلب بيع آجل بمعرفه مع الدفعات واسم الطرف
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param saleId - معرف البيع الآجل
   * @returns البيع الآجل مع الدفعات والمبلغ المتبقي
   */
  async findOne(companyId: string, saleId: string) {
    return this.getDeferredSaleUseCase.execute(companyId, saleId);
  }

  /**
   * جلب قائمة البيوع الآجلة مع التصفية والصفحات
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param query - معاملات التصفية والصفحات
   * @returns قائمة مُصفَّحة من البيوع الآجلة
   */
  async findAll(companyId: string, query: QueryDeferredSaleDto) {
    return this.listDeferredSalesUseCase.execute(companyId, query);
  }
}

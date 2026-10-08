// ============================================================
// Installments Service — Pure Delegation Layer
// ============================================================
//
// هذا الـ Service هو طبقة تفويض صِرف.
// لا يحتوي على منطق أعمال — كل المنطق في Use Cases.
//
// يُقدّم واجهة موحّدة للـ Controller وأي وحدة أخرى تحتاجه.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import {
  CreateContractUseCase,
  RecordInstallmentPaymentUseCase,
  CancelContractUseCase,
  GetContractUseCase,
  ListContractsUseCase,
  GetScheduleUseCase,
} from './use-cases';
import { CreateContractDto } from './dto/create-contract.dto';
import { RecordInstallmentPaymentDto } from './dto/record-installment-payment.dto';
import { QueryContractsDto } from './dto/query-contracts.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';

@Injectable()
export class InstallmentsService {
  private readonly logger = new Logger(InstallmentsService.name);

  constructor(
    private readonly createContractUseCase: CreateContractUseCase,
    private readonly recordInstallmentPaymentUseCase: RecordInstallmentPaymentUseCase,
    private readonly cancelContractUseCase: CancelContractUseCase,
    private readonly getContractUseCase: GetContractUseCase,
    private readonly listContractsUseCase: ListContractsUseCase,
    private readonly getScheduleUseCase: GetScheduleUseCase,
  ) {}

  /**
   * إنشاء عقد تقسيط جديد مع الأقساط المرتبطة والحركات المالية.
   *
   * @param companyId - معرف الشركة
   * @param actorUserId - معرف المستخدم المنفّذ
   * @param dto - بيانات إنشاء العقد
   * @returns العقد المنشأ مع أقساطه
   */
  async createContract(
    companyId: string,
    actorUserId: string,
    dto: CreateContractDto,
  ) {
    return this.createContractUseCase.execute(companyId, actorUserId, dto);
  }

  /**
   * تسجيل دفعة على قسط محدد.
   *
   * @param companyId - معرف الشركة
   * @param contractId - معرف العقد
   * @param actorUserId - معرف المستخدم المنفّذ
   * @param dto - بيانات الدفعة
   * @returns سجل الدفعة المنشأ
   */
  async recordPayment(
    companyId: string,
    contractId: string,
    actorUserId: string,
    dto: RecordInstallmentPaymentDto,
  ) {
    return this.recordInstallmentPaymentUseCase.execute(
      companyId,
      contractId,
      actorUserId,
      dto,
    );
  }

  /**
   * إلغاء عقد تقسيط وعكس الآثار المالية.
   *
   * @param companyId - معرف الشركة
   * @param contractId - معرف العقد
   * @param actorUserId - معرف المستخدم المنفّذ (OWNER فقط)
   */
  async cancelContract(
    companyId: string,
    contractId: string,
    actorUserId: string,
  ): Promise<void> {
    return this.cancelContractUseCase.execute(companyId, contractId, actorUserId);
  }

  /**
   * جلب عقد تقسيط واحد مع أقساطه.
   *
   * @param companyId - معرف الشركة
   * @param contractId - معرف العقد
   * @param includePayments - هل نجلب الدفعات لكل قسط؟
   * @returns العقد مع الأقساط واسم الطرف
   */
  async findOne(
    companyId: string,
    contractId: string,
    includePayments = false,
  ) {
    return this.getContractUseCase.execute(companyId, contractId, includePayments);
  }

  /**
   * جلب قائمة عقود التقسيط مع pagination وفلاتر.
   *
   * @param companyId - معرف الشركة
   * @param query - معاملات الاستعلام
   * @returns قائمة مُجمَّعة مع meta
   */
  async findAll(companyId: string, query: QueryContractsDto) {
    return this.listContractsUseCase.execute(companyId, query);
  }

  /**
   * جلب الأقساط المستحقة خلال نطاق زمني محدد.
   *
   * @param companyId - معرف الشركة
   * @param query - معاملات الاستعلام (dateFrom, dateTo, status)
   * @returns قائمة مُجمَّعة مع meta
   */
  async getSchedule(companyId: string, query: QueryScheduleDto) {
    return this.getScheduleUseCase.execute(companyId, query);
  }
}

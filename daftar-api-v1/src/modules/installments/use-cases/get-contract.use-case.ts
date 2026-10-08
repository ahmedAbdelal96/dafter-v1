// ============================================================
// Use Case: Get Contract (جلب عقد تقسيط واحد)
// ============================================================
//
// يجلب العقد مع:
//   - جميع الأقساط مرتبة بـ installmentNumber ASC
//   - اسم الطرف
//   - الدفعات لكل قسط إذا طُلب ذلك (includePayments=true)
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InstallmentsRepository } from '../installments.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetContractUseCase {
  private readonly logger = new Logger(GetContractUseCase.name);

  constructor(
    private readonly repo: InstallmentsRepository,
    private readonly t: TranslationService,
  ) {}

  /**
   * يجلب عقد تقسيط واحد مع أقساطه وبيانات الطرف.
   *
   * @param companyId - معرف الشركة (multi-tenant isolation)
   * @param contractId - معرف العقد
   * @param includePayments - هل نجلب الدفعات لكل قسط؟ (اختياري)
   * @returns العقد مع الأقساط واسم الطرف
   * @throws NotFoundException إذا لم يوجد العقد
   */
  async execute(
    companyId: string,
    contractId: string,
    includePayments = false,
  ) {
    const contract = await this.repo.findContractById(
      companyId,
      contractId,
      true,
      includePayments,
    );

    if (!contract) {
      throw new NotFoundException(
        this.t.translate('installments.get.notFound'),
      );
    }

    // Enrich with party name (single additional DB call)
    const partyName = await this.repo.getPartyName(
      companyId,
      contract.partyType,
      contract.partyId,
    );

    this.logger.debug(
      `GetContract: ${contractId} | includePayments: ${includePayments}`,
    );

    return {
      ...contract,
      partyName: partyName ?? null,
    };
  }
}

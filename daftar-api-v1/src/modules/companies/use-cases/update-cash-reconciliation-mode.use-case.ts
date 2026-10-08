import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompaniesRepository } from '../companies.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { UpdateCashReconciliationModeDto } from '../dto/update-cash-reconciliation-mode.dto';

@Injectable()
export class UpdateCashReconciliationModeUseCase {
  constructor(
    private readonly companiesRepo: CompaniesRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(
    companyId: string | null | undefined,
    actorUserId: string,
    dto: UpdateCashReconciliationModeDto,
  ) {
    if (!companyId) {
      throw new ForbiddenException(this.t.translate('companies.me.noCompany'));
    }

    const existing = await this.companiesRepo.getCashReconciliationMode(companyId);
    if (!existing) {
      throw new NotFoundException(this.t.translate('companies.get.notFound'));
    }

    if (existing.cashReconciliationMode === dto.mode) {
      return existing;
    }

    try {
      return await this.companiesRepo.updateCashReconciliationMode(
        companyId,
        dto.mode,
        actorUserId,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(this.t.translate('companies.me.versionConflict'));
      }
      throw error;
    }
  }
}


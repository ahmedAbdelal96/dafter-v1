import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { DeleteCompanyDto } from '../dto/delete-company.dto';

@Injectable()
export class DeleteCompanyUseCase {
  private readonly logger = new Logger(DeleteCompanyUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  private isHardDeleteAllowed(): boolean {
    // Archival-first by default:
    // - production is always blocked
    // - non-production requires explicit override
    if (process.env.NODE_ENV === 'production') return false;
    return process.env.ALLOW_COMPANY_HARD_DELETE === 'true';
  }

  private async logBlockedAttempt(params: {
    companyId: string;
    actorUserId: string;
    reasonCode: string;
    reason?: string;
    details?: Record<string, unknown>;
  }) {
    try {
      await this.platformRepo.logBlockedHardDeleteAttempt(params);
    } catch (error) {
      this.logger.warn(
        `Failed to persist blocked delete audit for ${params.companyId}: ${error?.message ?? 'unknown error'}`,
      );
    }
  }

  async execute(companyId: string, dto: DeleteCompanyDto, actorUserId: string) {
    const company = await this.platformRepo.findCompanyByIdAnyState(companyId);
    if (!company) {
      throw new NotFoundException(
        this.t.translate('platform.companies.delete.notFound'),
      );
    }

    if (!this.isHardDeleteAllowed()) {
      await this.logBlockedAttempt({
        companyId,
        actorUserId,
        reasonCode: 'HARD_DELETE_DISABLED',
        reason: dto.reason,
      });
      this.logger.warn(
        `Blocked hard-delete attempt for company ${companyId}: hard delete disabled by policy`,
      );
      throw new ConflictException({
        code: 'HARD_DELETE_DISABLED',
        message: 'Hard delete is disabled by policy. Archive/restore must be used.',
      });
    }

    if (dto.confirmCompanyName.trim() !== company.name.trim()) {
      await this.logBlockedAttempt({
        companyId,
        actorUserId,
        reasonCode: 'CONFIRM_NAME_MISMATCH',
        reason: dto.reason,
      });
      throw new BadRequestException(
        this.t.translate('platform.companies.delete.confirmNameMismatch'),
      );
    }

    if (company.isActive) {
      await this.logBlockedAttempt({
        companyId,
        actorUserId,
        reasonCode: 'MUST_DISABLE_FIRST',
        reason: dto.reason,
      });
      throw new ConflictException(
        this.t.translate('platform.companies.delete.mustDisableFirst'),
      );
    }

    if (!company.isDeleted) {
      await this.logBlockedAttempt({
        companyId,
        actorUserId,
        reasonCode: 'MUST_ARCHIVE_FIRST',
        reason: dto.reason,
      });
      throw new ConflictException({
        code: 'MUST_ARCHIVE_FIRST',
        message:
          'Hard delete requires archived company state. Archive the company first.',
      });
    }

    const blockers = await this.platformRepo.countHardDeleteBlockers(companyId);
    if (blockers.total > 0) {
      await this.logBlockedAttempt({
        companyId,
        actorUserId,
        reasonCode: 'HARD_DELETE_BLOCKED',
        reason: dto.reason,
        details: blockers,
      });
      throw new ConflictException({
        code: 'HARD_DELETE_BLOCKED',
        message:
          'Hard delete is blocked because financial/audit records still exist for this company.',
        details: blockers,
      });
    }

    try {
      // Deliberately hard-delete only after explicit guard checks.
      await this.platformRepo.hardDeleteCompany(companyId);
      return { id: companyId, deleted: true };
    } catch (error) {
      this.logger.error(
        `Failed to hard-delete company ${companyId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        this.t.translate('platform.companies.delete.failed'),
      );
    }
  }
}

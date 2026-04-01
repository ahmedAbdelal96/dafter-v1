import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { ArchiveCompanyDto } from '../dto/archive-company.dto';

@Injectable()
export class RestoreCompanyUseCase {
  private readonly logger = new Logger(RestoreCompanyUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, dto: ArchiveCompanyDto, actorUserId: string) {
    const company = await this.platformRepo.findCompanyByIdAnyState(companyId);
    if (!company) {
      throw new NotFoundException(
        this.t.translate('platform.companies.restore.notFound'),
      );
    }

    if (!company.isDeleted) {
      return company;
    }

    try {
      return await this.platformRepo.restoreCompany(
        companyId,
        actorUserId,
        dto.reason,
      );
    } catch (error) {
      this.logger.error(
        `Failed to restore company ${companyId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        this.t.translate('platform.companies.restore.failed'),
      );
    }
  }
}


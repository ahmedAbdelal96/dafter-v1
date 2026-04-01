import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class DisableCompanyUseCase {
  private readonly logger = new Logger(DisableCompanyUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, actorUserId: string) {
    const company = await this.platformRepo.findCompanyByIdBasic(companyId);
    if (!company) {
      throw new NotFoundException(
        this.t.translate('platform.companies.disable.notFound'),
      );
    }

    if (!company.isActive) {
      return company;
    }

    try {
      return await this.platformRepo.setCompanyActiveState(
        companyId,
        false,
        actorUserId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to disable company ${companyId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        this.t.translate('platform.companies.disable.failed'),
      );
    }
  }
}


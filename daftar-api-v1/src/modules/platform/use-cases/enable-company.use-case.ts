import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class EnableCompanyUseCase {
  private readonly logger = new Logger(EnableCompanyUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, actorUserId: string) {
    const company = await this.platformRepo.findCompanyByIdBasic(companyId);
    if (!company) {
      throw new NotFoundException(
        this.t.translate('platform.companies.enable.notFound'),
      );
    }

    if (company.isActive) {
      return company;
    }

    try {
      return await this.platformRepo.setCompanyActiveState(
        companyId,
        true,
        actorUserId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enable company ${companyId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        this.t.translate('platform.companies.enable.failed'),
      );
    }
  }
}


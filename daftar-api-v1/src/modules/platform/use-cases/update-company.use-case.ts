import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRepository } from '../platform.repository';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class UpdateCompanyUseCase {
  private readonly logger = new Logger(UpdateCompanyUseCase.name);

  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, dto: UpdateCompanyDto, actorUserId: string) {
    const existing = await this.platformRepo.findCompanyByIdBasic(companyId);
    if (!existing) {
      throw new NotFoundException(
        this.t.translate('platform.companies.update.notFound'),
      );
    }

    const updateData: Record<string, string> = {};
    if (dto.companyName !== undefined) updateData.name = dto.companyName.trim();
    if (dto.companyPhone !== undefined)
      updateData.phone = dto.companyPhone.trim();
    if (dto.companyAddress !== undefined)
      updateData.address = dto.companyAddress.trim();
    if (dto.currencyCode !== undefined)
      updateData.currencyCode = dto.currencyCode.trim().toUpperCase();

    // Idempotent behavior when no fields are provided.
    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    try {
      return await this.platformRepo.updateCompany(companyId, updateData, actorUserId);
    } catch (error) {
      this.logger.error(
        `Failed to update company ${companyId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        this.t.translate('platform.companies.update.failed'),
      );
    }
  }
}


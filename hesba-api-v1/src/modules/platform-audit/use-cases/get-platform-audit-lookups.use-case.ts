import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { QueryPlatformAuditLookupsDto } from '../dto';
import { PlatformAuditRepository } from '../platform-audit.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetPlatformAuditLookupsUseCase {
  private readonly logger = new Logger(GetPlatformAuditLookupsUseCase.name);

  constructor(
    private readonly repository: PlatformAuditRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(query: QueryPlatformAuditLookupsDto) {
    try {
      return await this.repository.findAuditLookups({
        companySearch: query.companySearch,
        actorSearch: query.actorSearch,
        companyId: query.companyId,
        limit: query.limit,
      });
    } catch (error) {
      this.logger.error(
        `Failed to load platform audit lookups: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        this.t.translate('platform.audit.lookups.failed'),
      );
    }
  }
}


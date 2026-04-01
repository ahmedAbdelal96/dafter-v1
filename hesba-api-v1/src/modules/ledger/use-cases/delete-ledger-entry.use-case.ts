import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LedgerRepository } from '../ledger.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class DeleteLedgerEntryUseCase {
  constructor(
    private readonly ledgerRepository: LedgerRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, entryId: string, actorUserId: string) {
    // ── Check: entry must exist (not already soft-deleted) ────
    const existing = await this.ledgerRepository.findById(companyId, entryId);

    if (!existing) {
      // Could be "not found" OR "already deleted" — check which
      const anyRecord = await this.ledgerRepository.findByIdIncludeDeleted(
        companyId,
        entryId,
      );

      if (anyRecord?.isDeleted === true) {
        throw new BadRequestException(
          this.t.translate('ledger.delete.alreadyDeleted'),
        );
      }

      throw new NotFoundException(this.t.translate('ledger.delete.notFound'));
    }

    // ── Execute: soft delete + reverse balance (atomic) ──────
    await this.ledgerRepository.softDeleteEntry(
      companyId,
      entryId,
      actorUserId,
    );
  }
}

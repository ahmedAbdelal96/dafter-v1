import { Injectable, NotFoundException } from '@nestjs/common';
import { LedgerRepository } from '../ledger.repository';
import { LedgerStatementQueryDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetStatementUseCase {
  constructor(
    private readonly ledgerRepository: LedgerRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(companyId: string, query: LedgerStatementQueryDto) {
    // ── Validation: party must exist in this company ──────────
    const partyFound = await this.ledgerRepository.partyExists(
      companyId,
      query.partyType,
      query.partyId,
    );

    if (!partyFound) {
      throw new NotFoundException(
        this.t.translate('ledger.statement.partyNotFound'),
      );
    }

    // ── Parse optional dates ──────────────────────────────────
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    if (query.dateFrom) {
      dateFrom = new Date(query.dateFrom);
      dateFrom.setUTCHours(0, 0, 0, 0);
    }

    if (query.dateTo) {
      dateTo = new Date(query.dateTo);
      // Include the full day: set to 23:59:59.999 UTC not needed
      // because entryDate is a @db.Date (no time component in DB).
      // Prisma's lte on a Date column does inclusive end-of-day on date-only fields.
      dateTo.setUTCHours(0, 0, 0, 0);
    }

    // ── Fetch statement ───────────────────────────────────────
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.ledgerRepository.getStatement({
      companyId,
      partyType: query.partyType,
      partyId: query.partyId,
      dateFrom,
      dateTo,
      page,
      limit,
    });

    return result;
  }
}

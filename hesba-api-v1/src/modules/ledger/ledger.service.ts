import { Injectable } from '@nestjs/common';
import {
  CreateLedgerEntryUseCase,
  DeleteLedgerEntryUseCase,
  GetStatementUseCase,
} from './use-cases';
import { CreateLedgerEntryDto, LedgerStatementQueryDto } from './dto';

@Injectable()
export class LedgerService {
  constructor(
    private readonly createLedgerEntryUseCase: CreateLedgerEntryUseCase,
    private readonly deleteLedgerEntryUseCase: DeleteLedgerEntryUseCase,
    private readonly getStatementUseCase: GetStatementUseCase,
  ) {}

  async createEntry(
    companyId: string,
    actorUserId: string,
    dto: CreateLedgerEntryDto,
  ) {
    return this.createLedgerEntryUseCase.execute(companyId, actorUserId, dto);
  }

  async deleteEntry(companyId: string, entryId: string, actorUserId: string) {
    return this.deleteLedgerEntryUseCase.execute(
      companyId,
      entryId,
      actorUserId,
    );
  }

  async getStatement(companyId: string, query: LedgerStatementQueryDto) {
    return this.getStatementUseCase.execute(companyId, query);
  }
}

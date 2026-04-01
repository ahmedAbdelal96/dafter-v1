// ============================================================
// Ledger Module — Wiring
// ============================================================

import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { LedgerRepository } from './ledger.repository';
import {
  CreateLedgerEntryUseCase,
  DeleteLedgerEntryUseCase,
  GetStatementUseCase,
} from './use-cases';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [LedgerController],
  providers: [
    // Core
    LedgerService,
    LedgerRepository,

    // Use Cases (one per business operation)
    CreateLedgerEntryUseCase,
    DeleteLedgerEntryUseCase,
    GetStatementUseCase,
  ],
  exports: [LedgerService, LedgerRepository],
})
export class LedgerModule {}

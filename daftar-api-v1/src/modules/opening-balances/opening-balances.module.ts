import { Module } from '@nestjs/common';
import { PlatformIdempotencyModule } from '../platform/idempotency/platform-idempotency.module';
import { AccountingModule } from '../accounting/accounting.module';
import { OpeningBalancesController } from './opening-balances.controller';
import { OpeningBalancesService } from './opening-balances.service';

@Module({
  imports: [PlatformIdempotencyModule, AccountingModule],
  controllers: [OpeningBalancesController],
  providers: [OpeningBalancesService],
  exports: [OpeningBalancesService],
})
export class OpeningBalancesModule {}

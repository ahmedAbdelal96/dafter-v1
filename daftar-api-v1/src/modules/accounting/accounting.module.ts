import { Module } from '@nestjs/common';
import { PlatformIdempotencyModule } from '../platform/idempotency/platform-idempotency.module';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

@Module({
  imports: [PlatformIdempotencyModule],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}

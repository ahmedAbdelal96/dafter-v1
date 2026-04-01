import { Module } from '@nestjs/common';
import { PlatformIdempotencyService } from './platform-idempotency.service';

@Module({
  providers: [PlatformIdempotencyService],
  exports: [PlatformIdempotencyService],
})
export class PlatformIdempotencyModule {}


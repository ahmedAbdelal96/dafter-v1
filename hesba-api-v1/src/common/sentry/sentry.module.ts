import { Module, Global } from '@nestjs/common';
import { SentryService } from './sentry.service';

/**
 * Sentry Module
 * - Global module for error tracking
 * - Automatically initializes Sentry on app startup
 */
@Global()
@Module({
  providers: [SentryService],
  exports: [SentryService],
})
export class SentryModule {}

import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './logger.service';

/**
 * LoggerModule
 * - Global module متاح في كل التطبيق
 * - يوفر AppLoggerService للـ logging المركزي
 */
@Global()
@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}

import { Module, Global } from '@nestjs/common';
import { TranslationService } from './translation.service';

/**
 * @module TranslationModule
 * @description Global module providing translation services
 * @global - Available in all modules without explicit import
 */
@Global()
@Module({
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}

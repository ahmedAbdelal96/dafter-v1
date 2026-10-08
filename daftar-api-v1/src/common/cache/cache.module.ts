import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

/**
 * Cache Module - Global Module
 *
 * يوفر:
 * - تخزين مؤقت باستخدام Redis
 * - Decorators للـ caching/invalidation
 * - Interceptor لـ HTTP requests
 *
 * التثبيت في AppModule:
 * @Module({
 *   imports: [CacheModule]
 * })
 */
@Global()
@Module({
  providers: [
    CacheService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [CacheService],
})
export class CacheModule {}

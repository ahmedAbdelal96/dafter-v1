import { Injectable, NestInterceptor, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Cache Interceptor (DISABLED)
 *
 * تم تعطيل الـ interceptor-level caching لتجنب data inconsistency
 *
 * المشكلة الأصلية:
 * - الـ Interceptor كان يحفظ البيانات في namespace 'http'
 * - Services تحفظها في namespace 'app' (e.g., 'permissions', 'users')
 * - TTL مختلفة (5 دقائق vs 30 دقيقة) → data inconsistency
 * - عند invalidation من الـ service، الـ http cache لم يُمسح
 * - النتيجة: بيانات قديمة من الـ http cache بعد التعديل
 *
 * الحل:
 * - اعتماد كامل على service-level caching (@Cacheable)
 * - كل service يتحكم في cache الخاص به
 * - invalidation يحدث في service عند كل write operation
 * - consistency مضمون بـ 100%
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  /**
   * تم تعطيل الـ caching تماماً - استخدم service-level cache فقط
   *
   * جميع الـ requests تمرّ مباشرة للـ service
   * Service-level caching (@Cacheable decorator) يتعامل مع caching
   */
  intercept(_context: unknown, next: CallHandler): Observable<any> {
    // ✅ تمرير جميع الـ requests مباشرة للـ service بدون cache
    return next.handle();
  }
}

import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';
export const CACHE_NAMESPACE_METADATA = 'cache_namespace';

export interface CacheOptions {
  key?: string | ((args: any[]) => string);
  ttl?: number;
  namespace?: string;
}

/**
 * Decorator لتخزين نتائج الـ function في الـ Cache
 *
 * @example
 * @Cacheable({
 *   key: 'customers:all',
 *   ttl: 3600,
 *   namespace: 'customers'
 * })
 * async getAll() { ... }
 *
 * @example مع dynamic key
 * @Cacheable({
 *   key: (args) => `customer:${args[0]}`,
 *   ttl: 1800
 * })
 * async getById(id: string) { ... }
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService;
      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      // بناء المفتاح
      let cacheKey = options.key;
      if (typeof cacheKey === 'function') {
        cacheKey = cacheKey(args);
      } else {
        cacheKey = cacheKey || `${target.constructor.name}:${propertyKey}`;
      }

      const ttl = options.ttl || 3600;
      const namespace = options.namespace || 'app';

      // محاولة الحصول من الـ cache
      const cached = await cacheService.get(cacheKey, namespace);
      if (cached !== null) {
        return cached;
      }

      // تنفيذ الـ method الأصلي
      const result = await originalMethod.apply(this, args);

      // حفظ النتيجة في الـ cache
      await cacheService.set(cacheKey, result, { ttl, namespace });

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator لحذف keys من الـ Cache
 *
 * @example
 * @CacheInvalidate({
 *   keys: ['customers:all', 'customers:stats']
 * })
 * async create() { ... }
 */
export function CacheInvalidate(
  options: { keys: string | string[] } = { keys: [] },
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const cacheService = this.cacheService;
      if (!cacheService) {
        return result;
      }

      const keys = Array.isArray(options.keys) ? options.keys : [options.keys];
      for (const key of keys) {
        await cacheService.del(key);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator لحذف namespace كامل من الـ Cache
 *
 * @example
 * @InvalidateNamespace('customers')
 * async deleteCustomer() { ... }
 */
export function InvalidateNamespace(namespace: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const cacheService = this.cacheService;
      if (!cacheService) {
        return result;
      }

      await cacheService.invalidateNamespace(namespace);

      return result;
    };

    return descriptor;
  };
}

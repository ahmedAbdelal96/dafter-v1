import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ICacheOptions {
  ttl?: number; // بالثواني
  namespace?: string;
}

export interface ICacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private logger = new Logger(CacheService.name);
  private isAvailable = false;

  // Cache is now enabled
  private readonly CACHE_ENABLED = true;

  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      const redisUrl =
        this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        enableReadyCheck: false,
        enableOfflineQueue: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          if (times > 10) {
            this.logger.warn('⚠️ Redis retry exhausted, running without cache');
            return null; // Stop retrying
          }
          return delay;
        },
        connectTimeout: 5000,
        commandTimeout: 5000,
      });

      this.redis.on('connect', () => {
        this.isAvailable = true;
        this.logger.log('✅ Redis Connected');
      });

      this.redis.on('error', (err) => {
        this.isAvailable = false;
        this.logger.warn(
          `⚠️ Redis Error: ${err.message} - Running without cache`,
        );
      });

      this.redis.on('close', () => {
        this.isAvailable = false;
        this.logger.warn('⚠️ Redis Connection Closed - Running without cache');
      });

      // Try to connect without blocking
      this.redis
        .ping()
        .then(() => {
          this.isAvailable = true;
          this.logger.log('✅ Redis Cache Service Initialized');
        })
        .catch((err) => {
          this.isAvailable = false;
          this.logger.warn(
            `⚠️ Redis unavailable: ${err.message} - Application will work without cache`,
          );
        });
    } catch (error) {
      this.isAvailable = false;
      this.logger.warn(
        `⚠️ Failed to initialize Redis: ${error.message} - Running without cache`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis Connection Closed');
    }
  }

  // --- Multi-tenant Helpers ---
  async setForTenant(tenantId: string, key: string, value: any, ttl?: number) {
    return this.set(key, value, { ttl, namespace: `tenant:${tenantId}` });
  }

  async getForTenant<T = any>(tenantId: string, key: string) {
    return this.get<T>(key, `tenant:${tenantId}`);
  }

  /**
   * تخزين قيمة في الـ Cache
   */
  async set(key: string, value: any, options?: ICacheOptions): Promise<void> {
    // إذا كان الكاش معطل، تخطي الحفظ
    if (!this.CACHE_ENABLED) {
      return;
    }

    // إذا لم يكن Redis متاحاً، تخطي الحفظ
    if (!this.isAvailable || !this.redis) {
      return;
    }

    try {
      const ttl = options?.ttl || 3600; // 1 ساعة افتراضياً
      const namespace = options?.namespace || 'app';
      const fullKey = this.buildKey(namespace, key);
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serialized);
      } else {
        await this.redis.set(fullKey, serialized);
      }

      this.logger.debug(`Cache SET: ${fullKey} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.debug(`Cache SET Error (non-critical): ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على قيمة من الـ Cache
   */
  async get<T = any>(key: string, namespace?: string): Promise<T | null> {
    // إذا كان الكاش معطل، أرجع null (سيتم تحميل من DB)
    if (!this.CACHE_ENABLED) {
      return null;
    }

    // إذا لم يكن Redis متاحاً، أرجع null (سيتم تحميل من DB)
    if (!this.isAvailable || !this.redis) {
      return null;
    }

    try {
      const ns = namespace || 'app';
      const fullKey = this.buildKey(ns, key);
      const cached = await this.redis.get(fullKey);

      if (cached) {
        this.stats.hits++;
        this.logger.debug(`Cache HIT: ${fullKey}`);
        return JSON.parse(cached) as T;
      }

      this.stats.misses++;
      this.logger.debug(`Cache MISS: ${fullKey}`);
      return null;
    } catch (error) {
      this.logger.debug(`Cache GET Error (non-critical): ${error.message}`);
      return null;
    }
  }

  /**
   * الحصول على قيمة مع fallback callback
   */
  async getOrSet<T = any>(
    key: string,
    fallback: () => Promise<T>,
    options?: ICacheOptions,
  ): Promise<T> {
    try {
      const ns = options?.namespace || 'app';
      const cached = await this.get<T>(key, ns);

      if (cached !== null) {
        return cached;
      }

      // احصل على البيانات من الـ fallback
      const data = await fallback();

      // احفظها في الـ cache
      await this.set(key, data, options);

      return data;
    } catch (error) {
      this.logger.error(`Cache getOrSet Error: ${error.message}`);
      // في حالة الخطأ، استدع الـ fallback مباشرة
      return fallback();
    }
  }

  /**
   * حذف key واحد
   */
  async del(key: string, namespace?: string): Promise<number> {
    if (!this.isAvailable || !this.redis) {
      return 0;
    }

    try {
      const ns = namespace || 'app';
      const fullKey = this.buildKey(ns, key);
      const result = await this.redis.del(fullKey);
      this.logger.debug(`Cache DELETE: ${fullKey}`);
      return result;
    } catch (error) {
      this.logger.debug(`Cache DEL Error (non-critical): ${error.message}`);
      return 0;
    }
  }

  /**
   * حذف جميع keys في namespace معين
   */
  async invalidateNamespace(namespace: string): Promise<number> {
    if (!this.isAvailable || !this.redis) {
      return 0;
    }

    try {
      const pattern = `${namespace}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      this.logger.debug(
        `Cache INVALIDATE NAMESPACE: ${namespace} (${result} keys)`,
      );
      return result;
    } catch (error) {
      this.logger.debug(
        `Cache invalidateNamespace Error (non-critical): ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * حذف جميع البيانات في الـ cache
   */
  async flushAll(): Promise<void> {
    if (!this.isAvailable || !this.redis) {
      return;
    }

    try {
      await this.redis.flushall();
      this.logger.warn('Cache FLUSH ALL - All data cleared');
    } catch (error) {
      this.logger.debug(
        `Cache flushAll Error (non-critical): ${error.message}`,
      );
    }
  }

  /**
   * التحقق من وجود key
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    if (!this.isAvailable || !this.redis) {
      return false;
    }

    try {
      const ns = namespace || 'app';
      const fullKey = this.buildKey(ns, key);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.debug(`Cache exists Error (non-critical): ${error.message}`);
      return false;
    }
  }

  /**
   * تعيين الـ TTL (Time To Live)
   */
  async setTTL(key: string, ttl: number, namespace?: string): Promise<boolean> {
    if (!this.isAvailable || !this.redis) {
      return false;
    }

    try {
      const ns = namespace || 'app';
      const fullKey = this.buildKey(ns, key);
      const result = await this.redis.expire(fullKey, ttl);
      this.logger.debug(`Cache SET TTL: ${fullKey} (${ttl}s)`);
      return result === 1;
    } catch (error) {
      this.logger.debug(`Cache setTTL Error (non-critical): ${error.message}`);
      return false;
    }
  }

  /**
   * الحصول على الـ TTL المتبقي
   */
  async getTTL(key: string, namespace?: string): Promise<number> {
    if (!this.isAvailable || !this.redis) {
      return -1;
    }

    try {
      const ns = namespace || 'app';
      const fullKey = this.buildKey(ns, key);
      const ttl = await this.redis.ttl(fullKey);
      return ttl;
    } catch (error) {
      this.logger.debug(`Cache getTTL Error (non-critical): ${error.message}`);
      return -1;
    }
  }

  /**
   * زيادة عداد
   */
  async increment(
    key: string,
    value: number = 1,
    namespace?: string,
  ): Promise<number> {
    if (!this.isAvailable || !this.redis) {
      return 0;
    }

    try {
      const ns = namespace || 'app';
      const fullKey = this.buildKey(ns, key);
      const result = await this.redis.incrby(fullKey, value);
      this.logger.debug(`Cache INCREMENT: ${fullKey}`);
      return result;
    } catch (error) {
      this.logger.debug(
        `Cache increment Error (non-critical): ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * تقليل عداد
   */
  async decrement(
    key: string,
    value: number = 1,
    namespace?: string,
  ): Promise<number> {
    if (!this.isAvailable || !this.redis) {
      return 0;
    }

    try {
      const ns = namespace || 'app';
      const fullKey = this.buildKey(ns, key);
      const result = await this.redis.decrby(fullKey, value);
      this.logger.debug(`Cache DECREMENT: ${fullKey}`);
      return result;
    } catch (error) {
      this.logger.debug(
        `Cache decrement Error (non-critical): ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * العمل مع Lists
   */
  async pushList(
    key: string,
    values: any[],
    namespace?: string,
  ): Promise<number> {
    if (!this.isAvailable || !this.redis) {
      return 0;
    }

    try {
      const ns = namespace || 'app';
      const fullKey = this.buildKey(ns, key);
      const serialized = values.map((v) => JSON.stringify(v));
      const result = await this.redis.rpush(fullKey, ...serialized);
      return result;
    } catch (error) {
      this.logger.debug(
        `Cache pushList Error (non-critical): ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * الحصول على List
   */
  async getList<T = any>(
    key: string,
    start: number = 0,
    stop: number = -1,
    namespace?: string,
  ): Promise<T[]> {
    if (!this.isAvailable || !this.redis) {
      return [];
    }

    try {
      const ns = namespace || 'app';
      const fullKey = this.buildKey(ns, key);
      const items = await this.redis.lrange(fullKey, start, stop);
      return items.map((item) => JSON.parse(item)) as T[];
    } catch (error) {
      this.logger.debug(`Cache getList Error (non-critical): ${error.message}`);
      return [];
    }
  }

  /**
   * الحصول على إحصائيات الـ Cache
   */
  getStats(): ICacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
    this.logger.log('Cache Stats Reset');
  }

  /**
   * دالة مساعدة لبناء المفاتيح
   */
  private buildKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * الحصول على عميل Redis
   */
  getRedisClient(): Redis | null {
    return this.redis;
  }
}

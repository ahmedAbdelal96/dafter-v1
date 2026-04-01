// src/database/prisma/prisma.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'info' | 'warn' | 'error'
  >
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const logLevels: Array<'query' | 'info' | 'warn' | 'error'> =
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['warn', 'error'];

    // Create PostgreSQL connection pool with optimized settings
    // Configured for production-ready multi-tenant SaaS with 1000+ centers
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Connection pool settings
      max: parseInt(process.env.DB_POOL_MAX || '20', 10), // Max connections
      min: parseInt(process.env.DB_POOL_MIN || '5', 10), // Min connections
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10), // 30s
      connectionTimeoutMillis: parseInt(
        process.env.DB_CONNECTION_TIMEOUT || '10000',
        10,
      ), // 10s
      // Statement timeout to prevent long-running queries
      statement_timeout: parseInt(
        process.env.DB_STATEMENT_TIMEOUT || '30000',
        10,
      ), // 30s
      // Query timeout
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10), // 30s
      // Application name for monitoring
      application_name: 'daftar-backend',
    });

    // Handle pool errors
    pool.on('error', (err) => {
      this.logger.error('❌ Unexpected database pool error:', err);
    });

    pool.on('connect', () => {
      this.logger.debug('🔗 New database connection established');
    });

    pool.on('remove', () => {
      this.logger.debug('🔌 Database connection removed from pool');
    });

    const adapter = new PrismaPg(pool);

    // Optimized for 100+ concurrent users with proper connection pooling
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      log: logLevels,
      adapter,
    } as Prisma.PrismaClientOptions);
  }

  /**
   * Connect to database on module init
   */
  async onModuleInit(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this as PrismaClient).$connect();
      this.logger.log('✅ Connected to database');

      // Enable query logging in development
      if (process.env.NODE_ENV === 'development') {
        this.enableQueryLogging();
      }

      // Enable slow query monitoring in all environments
      this.enableSlowQueryMonitoring();
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Enable query logging for development
   */
  private enableQueryLogging(): void {
    (this as PrismaClient).$on(
      'query' as never,
      ((e: {
        query: string;
        params: string;
        duration: number;
        target: string;
      }) => {
        this.logger.debug(`📊 Query: ${e.query}`);
        this.logger.debug(`📊 Params: ${e.params}`);
        this.logger.debug(`⏱️  Duration: ${e.duration}ms`);
      }) as never,
    );
  }

  /**
   * Monitor and log slow queries (> 1 second)
   * Critical for production performance monitoring
   */
  private enableSlowQueryMonitoring(): void {
    const slowQueryThreshold = parseInt(
      process.env.SLOW_QUERY_THRESHOLD || '1000',
      10,
    );

    (this as PrismaClient).$on(
      'query' as never,
      ((e: {
        query: string;
        params: string;
        duration: number;
        target: string;
      }) => {
        if (e.duration >= slowQueryThreshold) {
          this.logger.warn(
            `🐌 SLOW QUERY DETECTED (${e.duration}ms - threshold: ${slowQueryThreshold}ms)`,
          );
          this.logger.warn(`Query: ${e.query}`);
          this.logger.warn(`Params: ${e.params}`);
          this.logger.warn(`Target: ${e.target}`);

          // In production, you might want to send this to monitoring service (Sentry, DataDog, etc.)
          if (process.env.NODE_ENV === 'production') {
            // TODO: Send to monitoring service
            // Example: Sentry.captureMessage(`Slow query: ${e.query}`, 'warning');
          }
        }
      }) as never,
    );
  }

  /**
   * Disconnect when the application shuts down
   */
  async onModuleDestroy(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this as PrismaClient).$disconnect();
    this.logger.log('🔌 Disconnected from database');
  }

  /**
   * Clean database - Only for testing!
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ Cannot clean database in production!');
    }

    const modelKeys = Object.keys(this).filter((key) => {
      const model = (this as Record<string, unknown>)[key];
      return model && typeof model === 'object' && 'deleteMany' in model;
    });

    this.logger.warn(
      `⚠️ Cleaning DB — Models: ${modelKeys.join(', ') || 'none'}`,
    );

    for (const key of modelKeys) {
      const model = (this as Record<string, unknown>)[key];
      if (model && typeof model === 'object' && 'deleteMany' in model) {
        await (
          model as { deleteMany: (args: unknown) => Promise<unknown> }
        ).deleteMany({});
      }
    }
  }
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AppLoggerService } from '../../logger/logger.service';

/**
 * Sentry Error Tracking Service
 *
 * Features:
 * - Centralized error tracking and monitoring
 * - Performance monitoring
 * - Release tracking
 * - User context tracking
 * - Custom tags and breadcrumbs
 */
@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new AppLoggerService();
  private isInitialized = false;

  constructor() {
    this.logger.setContext('Sentry');
  }

  onModuleInit() {
    this.initialize();
  }

  /**
   * Initialize Sentry SDK
   */
  initialize(): void {
    const dsn = process.env.SENTRY_DSN;
    const environment = process.env.NODE_ENV || 'development';

    // Only initialize if DSN is provided
    if (!dsn) {
      this.logger.warn('⚠️ Sentry DSN not provided. Error tracking disabled.');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment,
        // Release version from package.json or environment
        release: process.env.npm_package_version || process.env.RELEASE_VERSION,

        // Performance Monitoring
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev

        // Don't send errors in development unless explicitly enabled
        enabled:
          environment === 'production' || process.env.SENTRY_ENABLED === 'true',

        // Ignore common non-critical errors
        ignoreErrors: [
          'ECONNREFUSED',
          'ENOTFOUND',
          'ETIMEDOUT',
          'SequelizeConnectionError',
          'SequelizeValidationError',
        ],

        // Before send hook to sanitize sensitive data
        beforeSend(event) {
          // Sanitize sensitive data
          if (event.request) {
            // Remove authorization headers
            if (event.request.headers) {
              delete event.request.headers['authorization'];
              delete event.request.headers['cookie'];
              delete event.request.headers['x-api-key'];
            }

            // Sanitize body (basic sanitization)
            if (event.request.data && typeof event.request.data === 'object') {
              const data = event.request.data as Record<string, any>;
              const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
              sensitiveFields.forEach((field) => {
                if (field in data) {
                  data[field] = '[REDACTED]';
                }
              });
            }
          }

          return event;
        },
      });

      this.isInitialized = true;
      this.logger.log('✅ Sentry initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Sentry', error.stack);
    }
  }

  /**
   * Capture exception and send to Sentry
   */
  captureException(
    error: Error,
    context?: {
      user?: { id: string; tenantId?: string; role?: string };
      tags?: Record<string, string>;
      extra?: Record<string, any>;
    },
  ): void {
    if (!this.isInitialized) return;

    Sentry.withScope((scope) => {
      // Add user context
      if (context?.user) {
        scope.setUser({
          id: context.user.id,
          tenantId: context.user.tenantId,
          role: context.user.role,
        });
      }

      // Add tags
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      // Add extra data
      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      Sentry.captureException(error);
    });
  }

  /**
   * Capture message and send to Sentry
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: {
      tags?: Record<string, string>;
      extra?: Record<string, any>;
    },
  ): void {
    if (!this.isInitialized) return;

    Sentry.withScope((scope) => {
      // Add tags
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      // Add extra data
      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      Sentry.captureMessage(message, level);
    });
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(
    message: string,
    category?: string,
    level?: Sentry.SeverityLevel,
    data?: Record<string, any>,
  ): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      level: level || 'info',
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: {
    id: string;
    tenantId?: string;
    email?: string;
    role?: string;
  }): void {
    if (!this.isInitialized) return;

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.isInitialized) return;
    Sentry.setUser(null);
  }

  /**
   * Sanitize sensitive data
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'authorization',
      'cardNumber',
      'cvv',
      'pin',
    ];

    const sanitized = { ...data };

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  /**
   * Flush pending events (useful before shutdown)
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.isInitialized) return true;

    try {
      await Sentry.flush(timeout);
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to flush Sentry events', error.stack);
      return false;
    }
  }
}

/**
 * @fileoverview Translation Service - Automatic Language Detection
 * @description Centralized service for handling translations throughout the application
 *
 * @architecture
 * - Injects I18nService (globally provided by I18nModule.forRoot in AppModule)
 * - Tries I18nContext.current() first to honour the Accept-Language header
 * - Falls back to 'ar' when context is unavailable (Prisma transactions,
 *   background jobs, queue processors, etc.)
 * - No more "I18nContext not available" console warnings in production
 *
 * @usage
 * ```typescript
 * throw new NotFoundException(this.t.error('bookings', 'get', 'notFound'));
 * // System automatically uses the language from request headers
 * ```
 */

import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';

@Injectable()
export class TranslationService {
  constructor(private readonly i18nService: I18nService) {}

  /**
   * Resolve the active language.
   * - Inside an HTTP request → uses Accept-Language / i18n context lang
   * - Inside a Prisma transaction / background job → falls back to 'ar'
   */
  private get lang(): string {
    try {
      return I18nContext.current()?.lang ?? 'ar';
    } catch {
      return 'ar';
    }
  }

  /**
   * Translate a key with optional variable arguments.
   * Language is resolved from the current HTTP context when available,
   * otherwise 'ar' is used as fallback.
   *
   * @param key  - Dot-notation key, e.g. 'auth.login.success'
   * @param args - Optional interpolation variables
   */
  translate(key: string, args?: Record<string, any>): string {
    try {
      return this.i18nService.translate(key, {
        lang: this.lang,
        args,
      }) as string;
    } catch (error) {
      // If the key doesn't exist in the JSON files, return the key itself
      // so callers still get a human-readable string rather than undefined.
      return key;
    }
  }

  /** Current language resolved from the request context ('ar' | 'en'). */
  getCurrentLanguage(): string {
    return this.lang;
  }

  /** Returns true if the key resolves to a non-key string. */
  exists(key: string): boolean {
    try {
      const translation = this.translate(key);
      return translation !== key;
    } catch {
      return false;
    }
  }

  // ── Convenience helpers ───────────────────────────────────────────────────

  /** e.g. success('invoices', 'create') → 'invoice.create.success' key */
  success(module: string, action: string): string {
    return this.translate(`${module}.${action}.success`);
  }

  /** e.g. error('invoices', 'get', 'notFound') → 'invoice.get.notFound' key */
  error(module: string, action: string, errorType: string): string {
    return this.translate(`${module}.${action}.${errorType}`);
  }

  validation(rule: string, field: string, args?: Record<string, any>): string {
    return this.translate(`common.validation.${rule}`, { field, ...args });
  }

  notFound(resource?: string): string {
    return resource
      ? this.translate(`${resource}.get.notFound`)
      : this.translate('common.notFound');
  }

  unauthorized(): string {
    return this.translate('common.unauthorized');
  }

  forbidden(): string {
    return this.translate('common.forbidden');
  }

  badRequest(): string {
    return this.translate('common.badRequest');
  }

  internalServerError(): string {
    return this.translate('common.internalServerError');
  }
}

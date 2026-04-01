import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @decorator CurrentLang
 * @description Extracts the current language from the request context
 * @usage
 * ```typescript
 * @Get()
 * async getData(@CurrentLang() lang: string) {
 *   // lang will be 'ar' or 'en'
 * }
 * ```
 *
 * @priority
 * 1. Query parameter: ?lang=en
 * 2. Custom header: x-lang: en
 * 3. Accept-Language header
 * 4. Fallback to 'ar' (Arabic)
 */
export const CurrentLang = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Priority 1: Query parameter
    if (request.query?.lang) {
      return request.query.lang;
    }

    // Priority 2: Custom header
    if (request.headers['x-lang']) {
      return request.headers['x-lang'];
    }

    // Priority 3: Accept-Language header
    if (request.headers['accept-language']) {
      const lang = request.headers['accept-language']
        .split(',')[0]
        .split('-')[0];
      return lang;
    }

    // Fallback to Arabic
    return 'ar';
  },
);

/**
 * @decorator Lang
 * @description Alias for CurrentLang decorator
 */
export const Lang = CurrentLang;

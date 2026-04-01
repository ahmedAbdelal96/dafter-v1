import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppLoggerService } from '../../logger/logger.service';

/**
 * Global HTTP logging interceptor.
 * - Emits one request log and one response log per request.
 * - Adds/propagates correlation id in request context and response header.
 * - Redacts sensitive fields from logged payloads.
 */
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, headers } = request;

    const correlationId =
      (headers['x-correlation-id'] as string) ||
      (headers['x-request-id'] as string) ||
      uuidv4();

    (request as any).correlationId = correlationId;
    response.setHeader('X-Correlation-ID', correlationId);

    const startTime = Date.now();
    const user = (request as any).user;

    this.logRequest(request, correlationId, user);

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          this.logResponse(request, response, responseTime, correlationId, user);

          if (responseTime > 3000) {
            this.logger.warn(
              `[HTTP] Slow Request: ${method} ${url} took ${responseTime}ms`,
              'HTTP',
            );
          }
        },
        error: (error: Error & { status?: number }) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error?.status ?? response.statusCode ?? 500;

          this.logger.error(
            `[HTTP] Request Failed: ${method} ${url} ${statusCode} in ${responseTime}ms`,
            error?.stack,
            'HTTP',
          );

          this.logger.debug(
            `[HTTP] Error Details | ${JSON.stringify({
              correlationId,
              method,
              url,
              statusCode,
              responseTime,
              message: error?.message,
            })}`,
            'HTTP',
          );
        },
      }),
    );
  }

  private logRequest(request: Request, correlationId: string, user?: any): void {
    const { method, url, body, query, params, headers, ip } = request;

    this.logger.log(`[HTTP] 📥 ${method} ${url}`, 'HTTP');
    this.logger.debug(
      `[HTTP] Request Details | ${JSON.stringify({
        correlationId,
        method,
        url,
        ip,
        userAgent: headers['user-agent'],
        companyId: user?.companyId ?? user?.tenantId,
        userId: user?.id,
        userRole: user?.role,
        params: this.sanitizeData(params),
        query: this.sanitizeData(query),
        body: this.sanitizeData(body),
      })}`,
      'HTTP',
    );
  }

  private logResponse(
    request: Request,
    response: Response,
    responseTime: number,
    correlationId: string,
    user?: any,
  ): void {
    const { method, url } = request;
    const { statusCode } = response;

    const message = `[HTTP] 📤 ${method} ${url} ${statusCode} in ${responseTime}ms`;

    if (statusCode >= 500) {
      this.logger.error(message, undefined, 'HTTP');
    } else if (statusCode >= 400) {
      this.logger.warn(message, 'HTTP');
    } else {
      this.logger.log(message, 'HTTP');
    }

    this.logger.debug(
      `[HTTP] Response Details | ${JSON.stringify({
        correlationId,
        method,
        url,
        statusCode,
        responseTime,
        userId: user?.id,
      })}`,
      'HTTP',
    );
  }

  private sanitizeData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = new Set([
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
    ]);

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const source = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(source)) {
      if (sensitiveFields.has(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      sanitized[key] = this.sanitizeData(value);
    }

    return sanitized;
  }
}

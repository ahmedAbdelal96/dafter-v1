/**
 * @fileoverview Global Exception Filter with i18n Support
 * @description Catches all exceptions and returns translated error messages
 * @best-practices
 * - Return user-friendly translated messages
 * - Log technical errors for debugging
 * - Handle different exception types appropriately
 * - Include error tracking (Sentry integration)
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext } from 'nestjs-i18n';
import { TranslationService } from '../services/translation.service';

/**
 * Error Response Structure
 */
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  lang: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly translationService: TranslationService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const i18n = I18nContext.current(host);
    const lang = i18n?.lang || 'ar';

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get error message
    let message: string | string[];
    let errorType: string;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = this.translateMessage(exceptionResponse);
        errorType = exception.constructor.name;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;

        // Handle validation errors (class-validator)
        if (responseObj.message && Array.isArray(responseObj.message)) {
          message = responseObj.message.map((msg: string) =>
            this.translateValidationMessage(msg),
          );
        } else if (responseObj.message) {
          message = this.translateMessage(responseObj.message);
        } else {
          message = this.getDefaultMessage(status);
        }

        errorType = responseObj.error || exception.constructor.name;
      } else {
        message = this.getDefaultMessage(status);
        errorType = exception.constructor.name;
      }
    } else if (exception instanceof Error) {
      // Handle native JavaScript errors
      this.logger.error(
        `Unhandled Error: ${exception.message}`,
        exception.stack,
      );
      message = this.translationService.internalServerError();
      errorType = 'InternalServerError';
    } else {
      // Unknown exception type
      this.logger.error('Unknown exception type', exception);
      message = this.translationService.translate('common.error');
      errorType = 'UnknownError';
    }

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error: errorType,
      timestamp: new Date().toISOString(),
      path: request.url,
      lang,
    };

    // Log error for monitoring
    this.logError(request, status, message, exception);

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Translate error message if it's a translation key
   * Language is automatically detected from I18nContext
   */
  private translateMessage(message: string): string {
    // Check if message is a translation key (contains dots like 'auth.login.invalidCredentials')
    if (message.includes('.') && this.translationService.exists(message)) {
      return this.translationService.translate(message);
    }
    return message;
  }

  /**
   * Translate validation error messages
   * Language is automatically detected from I18nContext
   * @example "email must be an email" => "حقل email يجب أن يكون بريد إلكتروني صحيح"
   */
  private translateValidationMessage(message: string): string {
    // Parse validation message (format: "field must be...")
    const patterns = [
      { regex: /(.+) should not be empty/, key: 'isNotEmpty' },
      { regex: /(.+) must be a string/, key: 'isString' },
      { regex: /(.+) must be a number/, key: 'isNumber' },
      { regex: /(.+) must be an email/, key: 'isEmail' },
      { regex: /(.+) must be a phone number/, key: 'isPhoneNumber' },
      { regex: /(.+) must be a date/, key: 'isDate' },
      { regex: /(.+) must be a boolean/, key: 'isBoolean' },
      { regex: /(.+) must be an array/, key: 'isArray' },
      { regex: /(.+) must be a URL/, key: 'isUrl' },
      {
        regex: /(.+) must be longer than or equal to (\d+) characters/,
        key: 'minLength',
      },
      {
        regex: /(.+) must be shorter than or equal to (\d+) characters/,
        key: 'maxLength',
      },
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern.regex);
      if (match) {
        const field = match[1];
        const args: Record<string, any> = { field };

        // Extract additional arguments (like min, max)
        if (match[2]) {
          if (pattern.key === 'minLength') args.min = match[2];
          if (pattern.key === 'maxLength') args.max = match[2];
        }

        return this.translationService.validation(pattern.key, field, args);
      }
    }

    // If no pattern matched, return original message
    return message;
  }

  /**
   * Get default translated message based on HTTP status
   * Language is automatically detected from I18nContext
   */
  private getDefaultMessage(status: number): string {
    const messageMap: Record<number, string> = {
      400: 'common.badRequest',
      401: 'common.unauthorized',
      403: 'common.forbidden',
      404: 'common.notFound',
      500: 'common.internalServerError',
    };

    const key = messageMap[status] || 'common.error';
    return this.translationService.translate(key);
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(
    request: Request,
    status: number,
    message: string | string[],
    exception: unknown,
  ) {
    const user = (request as any).user;
    const tenant = (request as any).tenant;

    const logMessage = `
      Status: ${status}
      Path: ${request.method} ${request.url}
      User: ${user?.id || 'Anonymous'}
      Tenant: ${tenant?.id || 'N/A'}
      Message: ${JSON.stringify(message)}
      IP: ${request.ip}
      User-Agent: ${request.headers['user-agent']}
    `;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : '',
      );
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    }
  }
}

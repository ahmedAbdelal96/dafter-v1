import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../../logger/logger.service';
import { SentryService } from '../sentry/sentry.service';
import { Prisma } from '@prisma/client';

/**
 * AllExceptionsFilter
 * - معالجة مركزية لكل الأخطاء في التطبيق
 * - تحويل أخطاء Prisma لرسائل واضحة
 * - تسجيل الأخطاء في الـ logs
 * - إرسال الأخطاء الحرجة إلى Sentry
 * - إرجاع response موحد للـ client
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLoggerService,
    @Optional() private readonly sentryService?: SentryService,
  ) {
    this.logger.setContext('ExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errors: any = null;
    let code: string | undefined;

    // معالجة HttpException من NestJS
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errors = (exceptionResponse as any).errors || null;
        code = (exceptionResponse as any).code;
      } else {
        message = exceptionResponse;
      }
    }
    // معالجة أخطاء Prisma
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
      code = exception.code;
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      code = 'VALIDATION_ERROR';
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database connection failed';
      code = 'DB_CONNECTION_ERROR';
    }
    // معالجة الأخطاء العامة
    else if (exception instanceof Error) {
      message = exception.message;

      // أخطاء Validation
      if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        code = 'VALIDATION_ERROR';
      }
      // أخطاء JWT
      else if (exception.name === 'JsonWebTokenError') {
        status = HttpStatus.UNAUTHORIZED;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
      } else if (exception.name === 'TokenExpiredError') {
        status = HttpStatus.UNAUTHORIZED;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
      }
    }

    // بناء الـ response
    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(code && { code }),
      ...(errors && { errors }),
      // في Development: أضف الـ stack trace
      ...(process.env.NODE_ENV === 'development' &&
        exception instanceof Error && {
          stack: exception.stack,
        }),
    };

    // تسجيل الخطأ
    const logMessage = `${request.method} ${request.url} - ${status} - ${
      Array.isArray(message) ? message.join(', ') : message
    }`;

    const user = (request as any).user;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );

      // إرسال الأخطاء الحرجة إلى Sentry
      if (this.sentryService && exception instanceof Error) {
        this.sentryService.captureException(exception, {
          user: user
            ? {
                id: user.id,
                tenantId: user.tenantId,
                role: user.role,
              }
            : undefined,
          tags: {
            method: request.method,
            url: request.url,
            statusCode: status.toString(),
          },
          extra: {
            body: request.body,
            query: request.query,
            params: request.params,
          },
        });
      }
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    }

    // إرسال الـ response
    response.status(status).json(errorResponse);
  }

  /**
   * معالجة أخطاء Prisma وتحويلها لرسائل واضحة
   */
  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (error.code) {
      // Unique constraint violation
      case 'P2002': {
        const target = (error.meta?.target as string[]) || [];
        return {
          status: HttpStatus.CONFLICT,
          message: `${target.join(', ')} already exists`,
        };
      }

      // Record not found
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
        };

      // Foreign key constraint failed
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to related record',
        };

      // Record required but not found
      case 'P2018':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Required record not found',
        };

      // Invalid input
      case 'P2019':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid input data',
        };

      // Transaction failed
      case 'P2034':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Transaction failed due to conflict',
        };

      // Database error
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Database operation failed',
        };
    }
  }
}

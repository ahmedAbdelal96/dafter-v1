// src/logger/logger.service.ts
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * AppLoggerService
 * - Centralized logging using Winston
 * - Daily rotating log files
 * - Different log levels: error, warn, info, debug
 * - Context-based logging
 * - Production-ready with file rotation and compression
 */
@Injectable()
export class AppLoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    this.logger = this.createLogger();
  }

  /**
   * إنشاء Winston Logger مع الإعدادات المناسبة
   */
  private createLogger(): winston.Logger {
    const logDir = process.env.LOG_DIR || 'logs';
    const logLevel = process.env.LOG_LEVEL || 'info';
    const isProduction = process.env.NODE_ENV === 'production';

    // Simple text format for files (readable)
    const fileFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.printf(
        ({ timestamp, level, message, context, ...meta }) => {
          const ctx = context ? `[${String(context)}]` : '';
          const metaStr = Object.keys(meta).length
            ? ` | ${JSON.stringify(meta)}`
            : '';
          return `${String(timestamp)} ${String(level).toUpperCase()} ${ctx} ${String(message)}${metaStr}`;
        },
      ),
    );

    // Console format (ملون ومنظم مثل الملفات)
    const consoleFormat = winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(
        ({ timestamp, level, message, context, ...meta }) => {
          // ألوان بسيطة للمستويات المختلفة
          let levelIcon = '';

          switch (level) {
            case 'error':
              levelIcon = '[ERR]';
              break;
            case 'warn':
              levelIcon = '[WRN]';
              break;
            case 'info':
              levelIcon = '[INF]';
              break;
            case 'debug':
              levelIcon = '[DBG]';
              break;
            case 'verbose':
              levelIcon = '[VRB]';
              break;
          }

          const ctx = context ? `[${String(context)}]` : '';
          const metaStr = Object.keys(meta).length
            ? ` | ${JSON.stringify(meta)}`
            : '';

          // Add icons to level display
          const levelDisplay = `${levelIcon} ${String(level).toUpperCase()}`;

          // UTF-8 encoding fix for Arabic text in Windows PowerShell
          const formattedMessage = `${String(timestamp)} ${levelDisplay} ${ctx} ${String(message)}${metaStr}`;

          return formattedMessage;
        },
      ),
    );

    const transports: winston.transport[] = [];

    // Console transport (في development فقط)
    if (!isProduction) {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
        }),
      );
    }

    // File transports (في كل الحالات)

    // Combined logs (info + warn + error)
    transports.push(
      new DailyRotateFile({
        dirname: logDir,
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: fileFormat,
      }),
    );

    // Error logs only
    transports.push(
      new DailyRotateFile({
        dirname: logDir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: fileFormat,
      }),
    );

    // Debug logs (في development فقط)
    if (!isProduction) {
      transports.push(
        new DailyRotateFile({
          dirname: logDir,
          filename: 'debug-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '7d',
          level: 'debug',
          format: fileFormat,
        }),
      );
    }

    // API Request/Response logs (في كل الحالات)
    transports.push(
      new DailyRotateFile({
        dirname: logDir,
        filename: 'api-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'debug',
        format: fileFormat,
      }),
    );

    // Performance logs (في كل الحالات)
    transports.push(
      new DailyRotateFile({
        dirname: logDir,
        filename: 'performance-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: fileFormat,
      }),
    );

    return winston.createLogger({
      level: logLevel,
      format: fileFormat,
      transports,
      exceptionHandlers: [
        new DailyRotateFile({
          dirname: logDir,
          filename: 'exceptions-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
        }),
      ],
      rejectionHandlers: [
        new DailyRotateFile({
          dirname: logDir,
          filename: 'rejections-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
        }),
      ],
    });
  }

  /**
   * Set context for all subsequent logs
   */
  setContext(context: string) {
    this.context = context;
  }

  /**
   * Log error message
   */
  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, {
      context: context || this.context,
      trace,
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  /**
   * Log verbose message
   */
  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context: context || this.context });
  }

  /**
   * Log HTTP request/response
   */
  http(message: string, meta?: Record<string, any>) {
    this.logger.http(message, { ...meta, context: this.context });
  }

  /**
   * Log database query
   */
  query(query: string, duration?: number) {
    this.logger.debug('Database Query', {
      context: this.context,
      query,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  /**
   * Log authentication event
   */
  auth(message: string, userId?: string, schoolId?: string) {
    this.logger.info(message, {
      context: 'Auth',
      userId,
      schoolId,
    });
  }

  /**
   * Log info message
   */
  log(message: string, context?: string) {
    this.logger.info(message, { context: context || this.context });
  }

  /**
   * Log info message (alias for log)
   */
  info(message: string, context?: string) {
    this.log(message, context);
  }

  /**
   * Log simple message with context
   */
  simple(message: string, data?: any) {
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    this.logger.info(`${message}${dataStr}`);
  }

  /**
   * Log API request (simple)
   */
  api(method: string, url: string, statusCode?: number, duration?: number) {
    const status = statusCode ? ` [${statusCode}]` : '';
    const time = duration ? ` (${duration}ms)` : '';
    this.logger.info(`API ${method} ${url}${status}${time}`);
  }

  /**
   * Log business event (simple)
   */
  event(event: string, details?: any) {
    const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
    this.logger.info(`EVENT: ${event}${detailsStr}`);
  }

  /**
   * Sanitize sensitive data from objects
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'apikey',
    ];
    const sanitized = { ...data };

    // Remove sensitive fields
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach((key) => {
      if (
        typeof sanitized[key] === 'object' &&
        sanitized[key] !== null &&
        !Array.isArray(sanitized[key])
      ) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      } else if (Array.isArray(sanitized[key])) {
        sanitized[key] = sanitized[key].map((item: any) =>
          typeof item === 'object' ? this.sanitizeData(item) : item,
        );
      }
    });

    return sanitized;
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers || typeof headers !== 'object') {
      return headers;
    }

    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'cookie',
      'set-cookie',
    ];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

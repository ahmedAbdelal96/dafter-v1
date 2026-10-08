import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { ApiResponseDto } from '../dto/api-response.dto';
import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const skipEnvelope = this.reflector.getAllAndOverride<boolean>(
      RAW_RESPONSE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipEnvelope) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => this.toEnvelope(data)));
  }

  private toEnvelope(data: unknown): unknown {
    if (data instanceof StreamableFile) {
      return data;
    }

    if (this.isApiSuccessEnvelope(data)) {
      return data;
    }

    return new ApiResponseDto(data);
  }

  private isApiSuccessEnvelope(data: unknown): data is ApiResponseDto<unknown> {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const candidate = data as Record<string, unknown>;
    return (
      typeof candidate.success === 'boolean' &&
      typeof candidate.timestamp === 'string'
    );
  }
}

import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { IdempotencyRecord, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface ExecuteIdempotentMutationParams<TPayload, TResult> {
  scope: string;
  operationType: string;
  actorUserId: string;
  companyId: string;
  idempotencyKey?: string;
  payload: TPayload;
  run: () => Promise<TResult>;
}

interface ExecuteDecision {
  mode: 'execute' | 'replay';
  record: IdempotencyRecord;
}

@Injectable()
export class PlatformIdempotencyService {
  private readonly logger = new Logger(PlatformIdempotencyService.name);
  private static readonly DEFAULT_TTL_SECONDS = 60 * 60 * 24;
  private static readonly DEFAULT_LOCK_SECONDS = 60;
  private static readonly STATUS_IN_PROGRESS = 'IN_PROGRESS';
  private static readonly STATUS_COMPLETED = 'COMPLETED';
  private static readonly STATUS_FAILED = 'FAILED';

  constructor(private readonly prisma: PrismaService) {}

  async executeMutation<TPayload, TResult>(
    params: ExecuteIdempotentMutationParams<TPayload, TResult>,
  ): Promise<TResult> {
    const idempotencyKey = params.idempotencyKey?.trim();
    if (!idempotencyKey) {
      if (this.isStrictMode()) {
        throw new BadRequestException({
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          message:
            'Idempotency key is required for this operation. Provide Idempotency-Key header.',
        });
      }
      return params.run();
    }

    const requestHash = this.buildRequestHash(params.payload);
    const decision = await this.acquireExecutionSlot({
      scope: params.scope,
      operationType: params.operationType,
      actorUserId: params.actorUserId,
      companyId: params.companyId,
      idempotencyKey,
      requestHash,
    });

    if (decision.mode === 'replay') {
      return (decision.record.responseBody as TResult) ?? ({} as TResult);
    }

    try {
      const result = await params.run();
      await this.prisma.idempotencyRecord.update({
        where: { id: decision.record.id },
        data: {
          status: PlatformIdempotencyService.STATUS_COMPLETED,
          responseStatus: 200,
          responseBody: this.toJsonSnapshot(result),
          errorCode: null,
          lockedUntil: null,
        },
      });

      return result;
    } catch (error) {
      const statusCode =
        error instanceof HttpException ? error.getStatus() : 500;
      const errorCode = this.extractErrorCode(error);

      await this.prisma.idempotencyRecord.update({
        where: { id: decision.record.id },
        data: {
          status: PlatformIdempotencyService.STATUS_FAILED,
          responseStatus: statusCode,
          responseBody: this.toJsonSnapshot({
            message:
              error instanceof HttpException
                ? error.message
                : 'Unhandled error during idempotent mutation',
          }),
          errorCode,
          lockedUntil: null,
        },
      });

      throw error;
    }
  }

  buildRequestHash(payload: unknown): string {
    const canonical = this.stableStringify(payload);
    return createHash('sha256').update(canonical).digest('hex');
  }

  private async acquireExecutionSlot(params: {
    scope: string;
    operationType: string;
    actorUserId: string;
    companyId: string;
    idempotencyKey: string;
    requestHash: string;
  }): Promise<ExecuteDecision> {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.resolveTtlSeconds() * 1000,
    );
    const lockedUntil = new Date(
      now.getTime() + this.resolveLockSeconds() * 1000,
    );
    let createdNewRecord = false;

    let record = await this.prisma.idempotencyRecord.findUnique({
      where: {
        companyId_operationType_idempotencyKey: {
          companyId: params.companyId,
          operationType: params.operationType,
          idempotencyKey: params.idempotencyKey,
        },
      },
    });

    if (!record) {
      try {
        record = await this.prisma.idempotencyRecord.create({
          data: {
            scope: params.scope,
            operationType: params.operationType,
            actorUserId: params.actorUserId,
            companyId: params.companyId,
            idempotencyKey: params.idempotencyKey,
            requestHash: params.requestHash,
            status: PlatformIdempotencyService.STATUS_IN_PROGRESS,
            expiresAt,
            lockedUntil,
          },
        });
        createdNewRecord = true;
      } catch (error) {
        const knownError = error as Prisma.PrismaClientKnownRequestError;
        if (knownError.code !== 'P2002') throw error;

        record = await this.prisma.idempotencyRecord.findUniqueOrThrow({
          where: {
            companyId_operationType_idempotencyKey: {
              companyId: params.companyId,
              operationType: params.operationType,
              idempotencyKey: params.idempotencyKey,
            },
          },
        });
      }
    }

    if (record.expiresAt <= now) {
      await this.prisma.idempotencyRecord.delete({
        where: { id: record.id },
      });

      return this.acquireExecutionSlot(params);
    }

    if (record.requestHash !== params.requestHash) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_HASH_MISMATCH',
        message:
          'Idempotency key is already used with a different request payload.',
      });
    }

    if (createdNewRecord) {
      return {
        mode: 'execute',
        record,
      };
    }

    if (record.status === PlatformIdempotencyService.STATUS_COMPLETED) {
      return { mode: 'replay', record };
    }

    if (
      record.status === PlatformIdempotencyService.STATUS_IN_PROGRESS &&
      record.lockedUntil &&
      record.lockedUntil > now
    ) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_IN_PROGRESS',
        message: 'Request with this idempotency key is currently in progress.',
      });
    }

    await this.prisma.idempotencyRecord.update({
      where: { id: record.id },
      data: {
        status: PlatformIdempotencyService.STATUS_IN_PROGRESS,
        lockedUntil,
        expiresAt,
        errorCode: null,
      },
    });

    const refreshed = await this.prisma.idempotencyRecord.findUniqueOrThrow({
      where: { id: record.id },
    });

    return {
      mode: 'execute',
      record: refreshed,
    };
  }

  private isStrictMode(): boolean {
    return process.env.IDEMPOTENCY_STRICT_MODE === 'true';
  }

  private resolveTtlSeconds(): number {
    return this.resolvePositiveInt(
      process.env.IDEMPOTENCY_TTL_SECONDS,
      PlatformIdempotencyService.DEFAULT_TTL_SECONDS,
    );
  }

  private resolveLockSeconds(): number {
    return this.resolvePositiveInt(
      process.env.IDEMPOTENCY_LOCK_SECONDS,
      PlatformIdempotencyService.DEFAULT_LOCK_SECONDS,
    );
  }

  private resolvePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue).sort();
    const serialized = keys.map(
      (key) => `${JSON.stringify(key)}:${this.stableStringify(objectValue[key])}`,
    );
    return `{${serialized.join(',')}}`;
  }

  private toJsonSnapshot(value: unknown): Prisma.InputJsonValue {
    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch (error) {
      this.logger.warn(`Failed to snapshot idempotency payload: ${error}`);
      return { snapshot: 'serialization_failed' } as Prisma.InputJsonValue;
    }
  }

  private extractErrorCode(error: unknown): string {
    if (!(error instanceof HttpException)) return 'INTERNAL_SERVER_ERROR';

    const response = error.getResponse();
    if (typeof response === 'object' && response && 'code' in response) {
      const code = (response as Record<string, unknown>).code;
      if (typeof code === 'string' && code.trim()) {
        return code;
      }
    }

    return error.name || 'HTTP_EXCEPTION';
  }
}

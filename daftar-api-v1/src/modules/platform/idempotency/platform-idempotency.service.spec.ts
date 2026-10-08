import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlatformIdempotencyService } from './platform-idempotency.service';

type IdempotencyRow = {
  id: string;
  scope: string;
  operationType: string;
  actorUserId: string;
  companyId: string;
  idempotencyKey: string;
  requestHash: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  responseStatus: number | null;
  responseBody: Prisma.JsonValue | null;
  errorCode: string | null;
  lockedUntil: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function createPrismaMock() {
  const rows = new Map<string, IdempotencyRow>();
  let sequence = 1;

  const compositeKey = (companyId: string, operationType: string, idempotencyKey: string) =>
    `${companyId}::${operationType}::${idempotencyKey}`;

  const idempotencyRecord = {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id) {
        return rows.get(where.id) ?? null;
      }
      const c = where.companyId_operationType_idempotencyKey;
      if (!c) return null;
      return rows.get(compositeKey(c.companyId, c.operationType, c.idempotencyKey)) ?? null;
    }),

    findUniqueOrThrow: jest.fn(async ({ where }: any) => {
      if (where.id) {
        const row = rows.get(where.id);
        if (!row) throw new Error('not found');
        return row;
      }
      const c = where.companyId_operationType_idempotencyKey;
      const row = rows.get(compositeKey(c.companyId, c.operationType, c.idempotencyKey));
      if (!row) throw new Error('not found');
      return row;
    }),

    create: jest.fn(async ({ data }: any) => {
      const key = compositeKey(data.companyId, data.operationType, data.idempotencyKey);
      if (rows.has(key)) {
        const error = new Error('duplicate') as Prisma.PrismaClientKnownRequestError;
        (error as any).code = 'P2002';
        throw error;
      }

      const now = new Date();
      const row: IdempotencyRow = {
        id: `idem-${sequence++}`,
        scope: data.scope,
        operationType: data.operationType,
        actorUserId: data.actorUserId,
        companyId: data.companyId,
        idempotencyKey: data.idempotencyKey,
        requestHash: data.requestHash,
        status: data.status ?? 'IN_PROGRESS',
        responseStatus: data.responseStatus ?? null,
        responseBody: data.responseBody ?? null,
        errorCode: data.errorCode ?? null,
        lockedUntil: data.lockedUntil ?? null,
        expiresAt: data.expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      rows.set(key, row);
      rows.set(row.id, row);
      return row;
    }),

    update: jest.fn(async ({ where, data }: any) => {
      const row = rows.get(where.id);
      if (!row) throw new Error('not found');
      const next = {
        ...row,
        ...data,
        updatedAt: new Date(),
      };
      rows.set(where.id, next);
      rows.set(
        compositeKey(next.companyId, next.operationType, next.idempotencyKey),
        next,
      );
      return next;
    }),

    delete: jest.fn(async ({ where }: any) => {
      const row = rows.get(where.id);
      if (!row) throw new Error('not found');
      rows.delete(where.id);
      rows.delete(compositeKey(row.companyId, row.operationType, row.idempotencyKey));
      return row;
    }),
  };

  return {
    prisma: { idempotencyRecord },
    rows,
    compositeKey,
  };
}

describe('PlatformIdempotencyService', () => {
  const defaultParams = {
    scope: 'platform.subscriptions.activate',
    operationType: 'activate',
    actorUserId: 'b9bf6691-0e50-4694-a0f7-6b82f3d064df',
    companyId: 'adf44872-35db-4f4d-b3ff-201934f0f7c0',
  };

  afterEach(() => {
    delete process.env.IDEMPOTENCY_STRICT_MODE;
  });

  it('runs in accept mode when key is absent', async () => {
    process.env.IDEMPOTENCY_STRICT_MODE = 'false';
    const { prisma } = createPrismaMock();
    const service = new PlatformIdempotencyService(prisma as any);

    const result = await service.executeMutation({
      ...defaultParams,
      payload: { a: 1 },
      run: async () => ({ ok: true }),
    });

    expect(result).toEqual({ ok: true });
    expect((prisma as any).idempotencyRecord.create).not.toHaveBeenCalled();
  });

  it('requires idempotency key in strict mode', async () => {
    process.env.IDEMPOTENCY_STRICT_MODE = 'true';
    const { prisma } = createPrismaMock();
    const service = new PlatformIdempotencyService(prisma as any);

    await expect(
      service.executeMutation({
        ...defaultParams,
        payload: { a: 1 },
        run: async () => ({ ok: true }),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replays completed response and does not rerun mutation', async () => {
    process.env.IDEMPOTENCY_STRICT_MODE = 'false';
    const { prisma, rows, compositeKey } = createPrismaMock();
    const service = new PlatformIdempotencyService(prisma as any);

    const run = jest.fn(async () => ({ subscriptionId: 'sub-1' }));
    const key = 'idem-key-1';
    const payload = { companyId: defaultParams.companyId, planId: 'plan-a' };
    const requestHash = service.buildRequestHash(payload);
    const now = new Date();

    const completedRow: IdempotencyRow = {
      id: 'idem-completed-1',
      scope: defaultParams.scope,
      operationType: defaultParams.operationType,
      actorUserId: defaultParams.actorUserId,
      companyId: defaultParams.companyId,
      idempotencyKey: key,
      requestHash,
      status: 'COMPLETED',
      responseStatus: 200,
      responseBody: { subscriptionId: 'sub-1' },
      errorCode: null,
      lockedUntil: null,
      expiresAt: new Date(now.getTime() + 86_400_000),
      createdAt: now,
      updatedAt: now,
    };
    rows.set(completedRow.id, completedRow);
    rows.set(
      compositeKey(
        completedRow.companyId,
        completedRow.operationType,
        completedRow.idempotencyKey,
      ),
      completedRow,
    );

    const replayed = await service.executeMutation({
      ...defaultParams,
      idempotencyKey: key,
      payload,
      run,
    });

    expect(replayed).toEqual({ subscriptionId: 'sub-1' });
    expect(run).not.toHaveBeenCalled();
  });

  it('throws hash mismatch on reused key with different payload', async () => {
    process.env.IDEMPOTENCY_STRICT_MODE = 'false';
    const { prisma, rows, compositeKey } = createPrismaMock();
    const service = new PlatformIdempotencyService(prisma as any);
    const key = 'idem-key-2';
    const now = new Date();
    const initialPayload = { companyId: defaultParams.companyId, planId: 'plan-a' };
    const existingHash = service.buildRequestHash(initialPayload);

    const existingRow: IdempotencyRow = {
      id: 'idem-existing-1',
      scope: defaultParams.scope,
      operationType: defaultParams.operationType,
      actorUserId: defaultParams.actorUserId,
      companyId: defaultParams.companyId,
      idempotencyKey: key,
      requestHash: existingHash,
      status: 'COMPLETED',
      responseStatus: 200,
      responseBody: { ok: true },
      errorCode: null,
      lockedUntil: null,
      expiresAt: new Date(now.getTime() + 86_400_000),
      createdAt: now,
      updatedAt: now,
    };
    rows.set(existingRow.id, existingRow);
    rows.set(
      compositeKey(
        existingRow.companyId,
        existingRow.operationType,
        existingRow.idempotencyKey,
      ),
      existingRow,
    );

    await expect(
      service.executeMutation({
        ...defaultParams,
        idempotencyKey: key,
        payload: { companyId: defaultParams.companyId, planId: 'plan-b' },
        run: async () => ({ ok: true }),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws in-progress conflict while lock is active', async () => {
    process.env.IDEMPOTENCY_STRICT_MODE = 'false';
    const { prisma, rows, compositeKey } = createPrismaMock();
    const service = new PlatformIdempotencyService(prisma as any);
    const payload = { companyId: defaultParams.companyId, reason: 'billing' };
    const requestHash = service.buildRequestHash(payload);
    const now = new Date();
    const row: IdempotencyRow = {
      id: 'idem-row-in-progress',
      scope: defaultParams.scope,
      operationType: defaultParams.operationType,
      actorUserId: defaultParams.actorUserId,
      companyId: defaultParams.companyId,
      idempotencyKey: 'idem-key-3',
      requestHash,
      status: 'IN_PROGRESS',
      responseStatus: null,
      responseBody: null,
      errorCode: null,
      lockedUntil: new Date(now.getTime() + 60_000),
      expiresAt: new Date(now.getTime() + 86_400_000),
      createdAt: now,
      updatedAt: now,
    };
    rows.set(row.id, row);
    rows.set(
      compositeKey(row.companyId, row.operationType, row.idempotencyKey),
      row,
    );

    await expect(
      service.executeMutation({
        ...defaultParams,
        idempotencyKey: row.idempotencyKey,
        payload,
        run: async () => ({ ok: true }),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows retry after FAILED state with same key and payload', async () => {
    process.env.IDEMPOTENCY_STRICT_MODE = 'false';
    const { prisma, rows, compositeKey } = createPrismaMock();
    const service = new PlatformIdempotencyService(prisma as any);
    const payload = { companyId: defaultParams.companyId, newEndDate: '2099-01-01' };
    const requestHash = service.buildRequestHash(payload);
    const now = new Date();
    const failedRow: IdempotencyRow = {
      id: 'idem-row-failed',
      scope: defaultParams.scope,
      operationType: defaultParams.operationType,
      actorUserId: defaultParams.actorUserId,
      companyId: defaultParams.companyId,
      idempotencyKey: 'idem-key-4',
      requestHash,
      status: 'FAILED',
      responseStatus: 500,
      responseBody: { message: 'failed once' },
      errorCode: 'INTERNAL_SERVER_ERROR',
      lockedUntil: null,
      expiresAt: new Date(now.getTime() + 86_400_000),
      createdAt: now,
      updatedAt: now,
    };
    rows.set(failedRow.id, failedRow);
    rows.set(
      compositeKey(
        failedRow.companyId,
        failedRow.operationType,
        failedRow.idempotencyKey,
      ),
      failedRow,
    );

    const result = await service.executeMutation({
      ...defaultParams,
      idempotencyKey: failedRow.idempotencyKey,
      payload,
      run: async () => ({ ok: true }),
    });

    expect(result).toEqual({ ok: true });
    const persisted = rows.get(failedRow.id)!;
    expect(persisted.status).toBe('COMPLETED');
  });

  it('stores failure metadata when mutation throws', async () => {
    process.env.IDEMPOTENCY_STRICT_MODE = 'false';
    const { prisma } = createPrismaMock();
    const service = new PlatformIdempotencyService(prisma as any);
    const key = 'idem-key-5';

    await expect(
      service.executeMutation({
        ...defaultParams,
        idempotencyKey: key,
        payload: { companyId: defaultParams.companyId },
        run: async () => {
          throw new HttpException(
            { code: 'LIVE_SUBSCRIPTION_CONFLICT', message: 'conflict' },
            HttpStatus.CONFLICT,
          );
        },
      }),
    ).rejects.toBeInstanceOf(HttpException);

    expect((prisma as any).idempotencyRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          errorCode: 'LIVE_SUBSCRIPTION_CONFLICT',
          responseStatus: 409,
        }),
      }),
    );
  });
});

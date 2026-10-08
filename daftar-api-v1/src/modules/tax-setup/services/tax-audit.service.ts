import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class TaxAuditService {
  log(
    tx: Prisma.TransactionClient,
    payload: {
      companyId: string;
      actorUserId: string;
      action: string;
      entityType: string;
      entityId?: string | null;
      metadata?: Record<string, unknown>;
      diff?: Record<string, unknown> | null;
    },
  ) {
    return tx.auditLog.create({
      data: {
        companyId: payload.companyId,
        actorUserId: payload.actorUserId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId ?? null,
        metadata: (payload.metadata ?? {}) as Prisma.InputJsonValue,
        diff: payload.diff === null ? Prisma.JsonNull : (payload.diff as Prisma.InputJsonValue),
      },
    });
  }
}

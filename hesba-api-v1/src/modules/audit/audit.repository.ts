import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(companyId: string, query: AuditQueryDto) {
    const { entity, entityId, actorId, action, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      ...(entity && { entityType: entity }),
      ...(entityId && { entityId }),
      ...(actorId && { actorUserId: actorId }),
      ...(action && { action }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          diff: true,
          createdAt: true,
          actorUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

export type PlatformAuditListParams = {
  page: number;
  limit: number;
  search?: string;
  companyId?: string;
  actorUserId?: string;
  action?: string;
  entityType?: string;
  fromDate?: Date;
  toDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PlatformAuditLookupsParams = {
  companySearch?: string;
  actorSearch?: string;
  companyId?: string;
  limit?: number;
};

@Injectable()
export class PlatformAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAuditLogs(params: PlatformAuditListParams) {
    const page = params.page > 0 ? params.page : 1;
    const limit = params.limit > 0 ? Math.min(params.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const allowedSortFields = new Set(['createdAt', 'action', 'entityType']);
    const sortBy = allowedSortFields.has(params.sortBy ?? '')
      ? (params.sortBy as 'createdAt' | 'action' | 'entityType')
      : 'createdAt';
    const sortOrder: Prisma.SortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.AuditLogWhereInput = {
      ...(params.companyId && { companyId: params.companyId }),
      ...(params.actorUserId && { actorUserId: params.actorUserId }),
      ...(params.action && {
        action: { contains: params.action, mode: 'insensitive' },
      }),
      ...(params.entityType && {
        entityType: { contains: params.entityType, mode: 'insensitive' },
      }),
      ...((params.fromDate || params.toDate) && {
        createdAt: {
          ...(params.fromDate && { gte: params.fromDate }),
          ...(params.toDate && { lte: params.toDate }),
        },
      }),
      ...(params.search && {
        OR: [
          { action: { contains: params.search, mode: 'insensitive' } },
          { entityType: { contains: params.search, mode: 'insensitive' } },
          { company: { name: { contains: params.search, mode: 'insensitive' } } },
          { actorUser: { fullName: { contains: params.search, mode: 'insensitive' } } },
          { actorUser: { email: { contains: params.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          actorUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findAuditLookups(params: PlatformAuditLookupsParams) {
    const limit = params.limit && params.limit > 0
      ? Math.min(params.limit, 100)
      : 30;

    const companiesWhere: Prisma.CompanyWhereInput = {
      isDeleted: false,
      ...(params.companySearch && {
        name: {
          contains: params.companySearch,
          mode: 'insensitive',
        },
      }),
    };

    const auditWhere: Prisma.AuditLogWhereInput = {
      ...(params.companyId && { companyId: params.companyId }),
    };

    const actorWhere: Prisma.AuditLogWhereInput = {
      ...auditWhere,
      ...(params.actorSearch && {
        OR: [
          {
            actorUser: {
              fullName: {
                contains: params.actorSearch,
                mode: 'insensitive',
              },
            },
          },
          {
            actorUser: {
              email: {
                contains: params.actorSearch,
                mode: 'insensitive',
              },
            },
          },
        ],
      }),
    };

    const [companies, actorsRaw, actionsRaw, entityTypesRaw] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where: companiesWhere,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where: actorWhere,
        distinct: ['actorUserId'],
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          actorUserId: true,
          actorUser: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.findMany({
        where: auditWhere,
        distinct: ['action'],
        take: limit,
        orderBy: { action: 'asc' },
        select: { action: true },
      }),
      this.prisma.auditLog.findMany({
        where: auditWhere,
        distinct: ['entityType'],
        take: limit,
        orderBy: { entityType: 'asc' },
        select: { entityType: true },
      }),
    ]);

    const actors = actorsRaw
      .filter((item) => item.actorUser)
      .map((item) => ({
        id: item.actorUserId,
        fullName: item.actorUser?.fullName ?? null,
        email: item.actorUser?.email ?? '',
      }))
      .filter((item) => Boolean(item.id) && Boolean(item.email));

    return {
      companies,
      actors,
      actions: actionsRaw
        .map((item) => item.action)
        .filter((item) => Boolean(item)),
      entityTypes: entityTypesRaw
        .map((item) => item.entityType)
        .filter((item) => Boolean(item)),
    };
  }
}

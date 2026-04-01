import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

export const PlatformAuditApiTags = () =>
  ApiTags('Platform Audit - Governance');

export const ListPlatformAuditLogsSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List persisted platform audit logs',
      description:
        'Returns platform-wide audit logs with governance filters (tenant, actor, action, entity, date range).',
    }),
    ApiQuery({ name: 'page', required: false, type: Number }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiQuery({ name: 'search', required: false, type: String }),
    ApiQuery({ name: 'companyId', required: false, type: String, format: 'uuid' }),
    ApiQuery({ name: 'actorUserId', required: false, type: String, format: 'uuid' }),
    ApiQuery({ name: 'action', required: false, type: String }),
    ApiQuery({ name: 'entityType', required: false, type: String }),
    ApiQuery({ name: 'fromDate', required: false, type: String, example: '2026-03-01' }),
    ApiQuery({ name: 'toDate', required: false, type: String, example: '2026-03-10' }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      enum: ['createdAt', 'action', 'entityType'],
    }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' }),
    ApiResponse({ status: 400, description: 'Invalid filter payload' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN only' }),
  );

export const GetPlatformAuditLookupsSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Load lookup options for audit filters',
      description:
        'Returns lookup lists for companies, actors, actions, and entity types used by the governance filters.',
    }),
    ApiQuery({ name: 'companySearch', required: false, type: String }),
    ApiQuery({ name: 'actorSearch', required: false, type: String }),
    ApiQuery({ name: 'companyId', required: false, type: String, format: 'uuid' }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiResponse({ status: 200, description: 'Audit lookup options retrieved successfully' }),
    ApiResponse({ status: 400, description: 'Invalid lookup query' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN only' }),
  );

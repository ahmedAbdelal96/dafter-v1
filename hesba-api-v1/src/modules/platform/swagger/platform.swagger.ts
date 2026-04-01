// ============================================
// Platform Swagger Decorators
// ============================================
// Centralized Swagger documentation for the Platform module.
// Super Admin endpoints for managing companies, plans, subscriptions.
// ============================================

import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { ActivateSubscriptionDto } from '../dto/activate-subscription.dto';
import { SuspendSubscriptionDto } from '../dto/suspend-subscription.dto';
import { ExtendSubscriptionDto } from '../dto/extend-subscription.dto';

// â”€â”€ Tag applied to entire controller â”€â”€
export const PlatformApiTags = () => ApiTags('ðŸ¢ Platform â€” Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØµØ©');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COMPANIES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const CreateCompanySwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Ø¥Ù†Ø´Ø§Ø¡ Ø´Ø±ÙƒØ© Ø¬Ø¯ÙŠØ¯Ø© (Super Admin ÙÙ‚Ø·)',
      description: `
ÙŠÙÙ†Ø´Ø¦ Ø´Ø±ÙƒØ© Ø¬Ø¯ÙŠØ¯Ø© Ù…Ø¹ Ø­Ø³Ø§Ø¨ Owner ÙˆØ§Ø´ØªØ±Ø§Ùƒ Ù†Ø´Ø· ÙÙŠ Ø¹Ù…Ù„ÙŠØ© ÙˆØ§Ø­Ø¯Ø© (atomic).

**Ù…Ø§ ÙŠØ­ØµÙ„:**
1. Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ØªÙØ±Ø¯ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ù„Ù„Ù…Ø§Ù„Ùƒ
2. Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙˆØ¬ÙˆØ¯ Ø§Ù„Ø®Ø·Ø© ÙˆØªÙØ¹ÙŠÙ„Ù‡Ø§
3. ØªØ´ÙÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±
4. Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø´Ø±ÙƒØ© + Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… + Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ÙÙŠ transaction ÙˆØ§Ø­Ø¯Ø©
5. ØªØ³Ø¬ÙŠÙ„ AuditLog

**Ù…Ù„Ø§Ø­Ø¸Ø©:** ÙŠØ®ØªÙ„Ù Ø¹Ù† Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø°Ø§ØªÙŠ â€” Ù„Ø§ ÙØªØ±Ø© ØªØ¬Ø±ÙŠØ¨ÙŠØ©ØŒ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ÙŠØ¨Ø¯Ø£ Ù†Ø´Ø·Ø§Ù‹ ÙÙˆØ±Ø§Ù‹.
      `,
    }),
    ApiBody({ type: CreateCompanyDto }),
    ApiResponse({
      status: 201,
      description: 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø´Ø±ÙƒØ© Ø¨Ù†Ø¬Ø§Ø­',
      schema: {
        example: {
          success: true,
          data: {
            company: {
              id: 'uuid',
              name: 'Ø´Ø±ÙƒØ© Ø§Ù„Ø¨Ø±ÙƒØ©',
              isActive: true,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            owner: {
              id: 'uuid',
              fullName: 'Ù…Ø­Ù…Ø¯ Ø¹Ù„ÙŠ',
              email: 'owner@company.com',
              role: 'OWNER',
            },
            subscription: {
              id: 'uuid',
              status: 'ACTIVE',
              endDate: '2027-01-01T00:00:00.000Z',
            },
          },
          message: 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø´Ø±ÙƒØ© ÙˆØ­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø§Ù„Ùƒ Ø¨Ù†Ø¬Ø§Ø­',
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ø§Ù„ÙØ¹Ù„',
    }),
    ApiResponse({ status: 404, description: 'Ø§Ù„Ø®Ø·Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø© Ø£Ùˆ ØºÙŠØ± Ù…ÙØ¹Ù„Ø©' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN ÙÙ‚Ø·' }),
  );

export const ListCompaniesSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø´Ø±ÙƒØ§Øª Ù…Ø¹ ÙÙ„ØªØ±Ø© ÙˆØ¨Ø­Ø«',
      description: `
ÙŠØ±Ø¬Ø¹ Ù‚Ø§Ø¦Ù…Ø© Ù…ÙØµÙ†Ù‘ÙØ© Ù…Ù† Ø§Ù„Ø´Ø±ÙƒØ§Øª Ù…Ø¹ Ø¥Ù…ÙƒØ§Ù†ÙŠØ© Ø§Ù„Ø¨Ø­Ø« ÙˆØ§Ù„ÙÙ„ØªØ±Ø©.

**Ø§Ù„ÙÙ„Ø§ØªØ± Ø§Ù„Ù…ØªØ§Ø­Ø©:**
- \`search\`: Ø¨Ø­Ø« Ø¨Ø§Ø³Ù… Ø§Ù„Ø´Ø±ÙƒØ© Ø£Ùˆ Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ
- \`subscriptionStatus\`: ACTIVE | TRIAL | SUSPENDED | EXPIRED | DISABLED
- \`isActive\`: true | false
- \`page\`, \`limit\`, \`sortBy\`, \`sortOrder\`

**Ù…Ù„Ø§Ø­Ø¸Ø©:** ÙƒÙ„ Ø´Ø±ÙƒØ© ØªØ¶Ù… Ø¨ÙŠØ§Ù†Ø§Øª Ø¢Ø®Ø± Ø§Ø´ØªØ±Ø§Ùƒ ÙˆØ¹Ø¯Ø¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†.
      `,
    }),
    ApiResponse({
      status: 200,
      description: 'ØªÙ… Ø¬Ù„Ø¨ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø´Ø±ÙƒØ§Øª',
      schema: {
        example: {
          success: true,
          data: {
            companies: [
              {
                id: 'uuid',
                name: 'Ø´Ø±ÙƒØ© Ø§Ù„Ù†ÙˆØ±',
                isActive: true,
                subscriptions: [{ status: 'ACTIVE', endDate: '2027-01-01' }],
                _count: { users: 5 },
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
          },
          message: 'ØªÙ… Ø¬Ù„Ø¨ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø´Ø±ÙƒØ§Øª',
        },
      },
    }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN ÙÙ‚Ø·' }),
  );

export const UpdateCompanySwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'Company ID (UUID)',
      type: 'string',
    }),
    ApiOperation({
      summary: 'Update company profile',
      description:
        'Update basic company fields (name, phone, address, currency) with audit logging.',
    }),
    ApiBody({ type: UpdateCompanyDto }),
    ApiResponse({ status: 200, description: 'Company updated successfully' }),
    ApiResponse({ status: 404, description: 'Company not found' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN only' }),
  );

export const DisableCompanySwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'Company ID (UUID)',
      type: 'string',
    }),
    ApiOperation({
      summary: 'Disable company',
      description:
        'Disable company access using platform emergency switch (isActive=false).',
    }),
    ApiResponse({ status: 200, description: 'Company disabled successfully' }),
    ApiResponse({ status: 404, description: 'Company not found' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN only' }),
  );

export const EnableCompanySwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'Company ID (UUID)',
      type: 'string',
    }),
    ApiOperation({
      summary: 'Enable company',
      description:
        'Enable company access again using platform emergency switch (isActive=true).',
    }),
    ApiResponse({ status: 200, description: 'Company enabled successfully' }),
    ApiResponse({ status: 404, description: 'Company not found' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN only' }),
  );

export const GetCompanySwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'Ù…Ø¹Ø±Ù‘Ù Ø§Ù„Ø´Ø±ÙƒØ© (UUID)',
      type: 'string',
    }),
    ApiOperation({
      summary: 'ØªÙØ§ØµÙŠÙ„ Ø´Ø±ÙƒØ© Ù…Ø­Ø¯Ø¯Ø©',
      description: `
ÙŠØ±Ø¬Ø¹ Ø¨ÙŠØ§Ù†Ø§Øª ÙƒØ§Ù…Ù„Ø© Ø¹Ù† Ø´Ø±ÙƒØ© ÙˆØ§Ø­Ø¯Ø© Ø¨Ù…Ø§ ÙŠØ´Ù…Ù„:
- Ø¢Ø®Ø± 3 Ø§Ø´ØªØ±Ø§ÙƒØ§Øª (Ù…Ø¹ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø®Ø·Ø©)
- Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† / Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ / Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ† / Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† / Ù‚ÙŠÙˆØ¯ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨Ø©
      `,
    }),
    ApiResponse({ status: 200, description: 'ØªÙ… Ø¬Ù„Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø±ÙƒØ©' }),
    ApiResponse({ status: 404, description: 'Ø§Ù„Ø´Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN ÙÙ‚Ø·' }),
  );

export const GetCompanyMetricsSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'Ù…Ø¹Ø±Ù‘Ù Ø§Ù„Ø´Ø±ÙƒØ© (UUID)',
      type: 'string',
    }),
    ApiOperation({
      summary: 'Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø´Ø±ÙƒØ© Ù…Ø­Ø¯Ø¯Ø©',
      description: `
ÙŠØ±Ø¬Ø¹ Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø­Ø§Ù„ÙŠ Ù„Ù„Ø´Ø±ÙƒØ© Ù…Ø¹ Ø­Ø¯ÙˆØ¯ Ø§Ù„Ø®Ø·Ø©.
Ù…ÙÙŠØ¯ Ù„Ù…Ø±Ø§Ù‚Ø¨Ø© Ø§Ù„Ø´Ø±ÙƒØ§Øª Ø§Ù„ØªÙŠ Ø§Ù‚ØªØ±Ø¨Øª Ù…Ù† Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰.
      `,
    }),
    ApiResponse({
      status: 200,
      description: 'ØªÙ… Ø¬Ù„Ø¨ Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª',
      schema: {
        example: {
          success: true,
          data: {
            companyId: 'uuid',
            companyName: 'Ø´Ø±ÙƒØ© Ø§Ù„Ù†ÙˆØ±',
            usersCount: 3,
            customersCount: 45,
            suppliersCount: 12,
            employeesCount: 8,
            ledgerEntriesCount: 230,
            subscription: { status: 'ACTIVE', plan: { maxUsers: 10 } },
          },
          message: 'ØªÙ… Ø¬Ù„Ø¨ Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ø´Ø±ÙƒØ©',
        },
      },
    }),
    ApiResponse({ status: 404, description: 'Ø§Ù„Ø´Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN ÙÙ‚Ø·' }),
  );

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PLANS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const CreatePlanSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Ø¥Ù†Ø´Ø§Ø¡ Ø®Ø·Ø© Ø§Ø´ØªØ±Ø§Ùƒ Ø¬Ø¯ÙŠØ¯Ø©',
      description: `
ÙŠÙ†Ø´Ø¦ Ø®Ø·Ø© Ø§Ø´ØªØ±Ø§Ùƒ Ø¬Ø¯ÙŠØ¯Ø© Ù…ØªØ§Ø­Ø© Ù„Ù„Ø´Ø±ÙƒØ§Øª.

**Ø§Ø³Ù… Ø§Ù„Ø®Ø·Ø©:** ÙŠÙØ­ÙˆÙ‘Ù„ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¥Ù„Ù‰ UPPERCASE (BASIC, PRO, ENTERPRISE...)

**Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø­Ø¯ÙˆØ¯:**
- \`maxUsers\`, \`maxCustomers\` ÙˆØºÙŠØ±Ù‡Ø§: null = ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯
- \`features\`: Ù…ØµÙÙˆÙØ© Ù†ØµÙŠØ© Ù…Ù† Ø§Ù„Ù…ÙŠØ²Ø§Øª Ø§Ù„Ø¥Ø¶Ø§ÙÙŠØ©
      `,
    }),
    ApiBody({ type: CreatePlanDto }),
    ApiResponse({ status: 201, description: 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø®Ø·Ø© Ø¨Ù†Ø¬Ø§Ø­' }),
    ApiResponse({ status: 409, description: 'ÙŠÙˆØ¬Ø¯ Ø®Ø·Ø© Ø¨Ù‡Ø°Ø§ Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„ÙØ¹Ù„' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN ÙÙ‚Ø·' }),
  );

export const ListPlansSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiQuery({
      name: 'includeInactive',
      required: false,
      type: Boolean,
      description: 'true = ÙŠØ´Ù…Ù„ Ø§Ù„Ø®Ø·Ø· Ø§Ù„Ù…Ø¹Ø·Ù„Ø©',
    }),
    ApiOperation({
      summary: 'Ù‚Ø§Ø¦Ù…Ø© Ø®Ø·Ø· Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ',
      description: 'ÙŠØ±Ø¬Ø¹ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø®Ø·Ø· (Ø§Ù„Ù…ÙØ¹Ù„Ø© Ø§ÙØªØ±Ø§Ø¶ÙŠØ§Ù‹). Ù…Ø±ØªØ¨Ø© Ø­Ø³Ø¨ Ø§Ù„Ø³Ø¹Ø±.',
    }),
    ApiResponse({ status: 200, description: 'ØªÙ… Ø¬Ù„Ø¨ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø®Ø·Ø·' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN ÙÙ‚Ø·' }),
  );

export const UpdatePlanSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Ù…Ø¹Ø±Ù‘Ù Ø§Ù„Ø®Ø·Ø© (UUID)', type: 'string' }),
    ApiOperation({
      summary: 'ØªØ­Ø¯ÙŠØ« Ø®Ø·Ø© Ø§Ø´ØªØ±Ø§Ùƒ',
      description: `
ÙŠÙØ¹Ø¯Ù‘Ù„ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø®Ø·Ø© Ø§Ø´ØªØ±Ø§Ùƒ Ù…ÙˆØ¬ÙˆØ¯Ø©.

**âš ï¸ ØªØ­Ø°ÙŠØ±:** ØªØºÙŠÙŠØ± Ø§Ù„Ø­Ø¯ÙˆØ¯ ÙŠØ¤Ø«Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø±ÙƒØ§Øª Ø§Ù„Ù…Ø´ØªØ±ÙƒØ© Ø­Ø§Ù„ÙŠØ§Ù‹.
Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ø®ØªÙŠØ§Ø±ÙŠØ© â€” Ø£Ø±Ø³Ù„ ÙÙ‚Ø· Ù…Ø§ ØªØ±ÙŠØ¯ ØªØºÙŠÙŠØ±Ù‡.
      `,
    }),
    ApiBody({ type: UpdatePlanDto }),
    ApiResponse({ status: 200, description: 'ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø®Ø·Ø© Ø¨Ù†Ø¬Ø§Ø­' }),
    ApiResponse({ status: 404, description: 'Ø§Ù„Ø®Ø·Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©' }),
    ApiResponse({ status: 409, description: 'Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ø§Ù„ÙØ¹Ù„' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN ÙÙ‚Ø·' }),
  );

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SUBSCRIPTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const ActivateSubscriptionSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'ØªÙØ¹ÙŠÙ„/ØªØ±Ù‚ÙŠØ© Ø§Ø´ØªØ±Ø§Ùƒ Ø´Ø±ÙƒØ©',
      description: `
ÙŠÙÙØ¹Ù‘Ù„ Ø§Ø´ØªØ±Ø§ÙƒØ§Ù‹ Ø¬Ø¯ÙŠØ¯Ø§Ù‹ Ù„Ø´Ø±ÙƒØ© â€” ÙŠÙØ³ØªØ®Ø¯Ù… Ù„Ù„ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø£ÙˆÙ„ Ø£Ùˆ Ø§Ù„ØªØ±Ù‚ÙŠØ©.

**Ù…Ø§ ÙŠØ­ØµÙ„:**
1. Ø¥Ù†Ù‡Ø§Ø¡ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ø§Ù„Ø­Ø§Ù„ÙŠ (ACTIVE/TRIAL â†’ EXPIRED)
2. Ø¥Ù†Ø´Ø§Ø¡ Ø§Ø´ØªØ±Ø§Ùƒ Ø¬Ø¯ÙŠØ¯ (ACTIVE)
3. Ø¥Ø¹Ø§Ø¯Ø© ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø´Ø±ÙƒØ© Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ù…Ø¹Ù„Ù‚Ø©
4. AuditLog

**Ù…Ø«Ø§Ù„ Ø§Ø³ØªØ®Ø¯Ø§Ù…:** Ø´Ø±ÙƒØ© Ø¬Ø¯ÙŠØ¯Ø©ØŒ ØªØ¬Ø¯ÙŠØ¯ ÙŠØ¯ÙˆÙŠØŒ ØªØ±Ù‚ÙŠØ© Ø§Ù„Ø®Ø·Ø©.
      `,
    }),
    ApiBody({ type: ActivateSubscriptionDto }),
    ApiResponse({ status: 201, description: 'ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ø¨Ù†Ø¬Ø§Ø­' }),
    ApiResponse({ status: 404, description: 'Ø§Ù„Ø´Ø±ÙƒØ© Ø£Ùˆ Ø§Ù„Ø®Ø·Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©' }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN ÙÙ‚Ø·' }),
  );

export const SuspendSubscriptionSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'ØªØ¹Ù„ÙŠÙ‚ Ø§Ø´ØªØ±Ø§Ùƒ Ø´Ø±ÙƒØ©',
      description: `
ÙŠÙˆÙ‚Ù Ø§Ø´ØªØ±Ø§Ùƒ Ø§Ù„Ø´Ø±ÙƒØ© Ø§Ù„Ø­Ø§Ù„ÙŠ â€” Ø§Ù„Ø´Ø±ÙƒØ© ØªØ¯Ø®Ù„ ÙˆØ¶Ø¹ Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© ÙÙ‚Ø·.

**ÙŠØ¤Ø«Ø± Ø¹Ù„Ù‰:** Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª ACTIVE Ùˆ TRIAL.
Ù„Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªÙØ¹ÙŠÙ„ Ø§Ø³ØªØ®Ø¯Ù… endpoint **Activate Subscription**.
      `,
    }),
    ApiBody({ type: SuspendSubscriptionDto }),
    ApiResponse({ status: 200, description: 'ØªÙ… ØªØ¹Ù„ÙŠÙ‚ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ø¨Ù†Ø¬Ø§Ø­' }),
    ApiResponse({
      status: 404,
      description: 'Ø§Ù„Ø´Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø© Ø£Ùˆ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø§Ø´ØªØ±Ø§Ùƒ Ù†Ø´Ø·',
    }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN ÙÙ‚Ø·' }),
  );

export const ExtendSubscriptionSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'ØªÙ…Ø¯ÙŠØ¯ Ø§Ø´ØªØ±Ø§Ùƒ Ø´Ø±ÙƒØ©',
      description: `
ÙŠÙ…Ø¯Ø¯ ØªØ§Ø±ÙŠØ® Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ. ÙŠØ¹Ù…Ù„ Ø¹Ù„Ù‰ Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª ACTIVE/TRIAL/SUSPENDED/EXPIRED.

**Ù…Ù„Ø§Ø­Ø¸Ø©:** Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ SUSPENDED Ø£Ùˆ EXPIRED â€” ÙŠÙØ¹Ø§Ø¯ ØªÙØ¹ÙŠÙ„Ù‡ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹.
Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¬Ø¯ÙŠØ¯ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† ÙÙŠ Ø§Ù„Ù…Ø³ØªÙ‚Ø¨Ù„.
      `,
    }),
    ApiBody({ type: ExtendSubscriptionDto }),
    ApiResponse({ status: 200, description: 'ØªÙ… ØªÙ…Ø¯ÙŠØ¯ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ø¨Ù†Ø¬Ø§Ø­' }),
    ApiResponse({
      status: 404,
      description: 'Ø§Ù„Ø´Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø© Ø£Ùˆ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø§Ø´ØªØ±Ø§Ùƒ',
    }),
    ApiResponse({
      status: 400,
      description: 'Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¬Ø¯ÙŠØ¯ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† ÙÙŠ Ø§Ù„Ù…Ø³ØªÙ‚Ø¨Ù„',
    }),
    ApiResponse({ status: 403, description: 'SUPER_ADMIN ÙÙ‚Ø·' }),
  );


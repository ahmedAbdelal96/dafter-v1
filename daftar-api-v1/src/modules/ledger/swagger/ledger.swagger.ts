// ==========================================================
// Ledger Swagger — Separated Decorators
// ==========================================================

import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateLedgerEntryDto } from '../dto';
import { PartyType, LedgerEntryType } from '@prisma/client';

// ── Module Tag ─────────────────────────────────────────────────────────────
export const LedgerApiTags = () => ApiTags('📒 Ledger — دفتر الأستاذ');

// ── Create Entry ───────────────────────────────────────────────────────────
export const CreateLedgerEntrySwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إضافة حركة مالية جديدة',
      description: `
        تسجيل حركة مالية جديدة (فاتورة / دفعة / إرجاع / تسوية ...) لطرف معين.

        **القواعد المالية:**
        - \`signedAmount\` موجب = مديونية على الطرف (فاتورة، مطالبة بالسداد).
        - \`signedAmount\` سالب = دفعة أو إشعار دائن.
        - الرصيد يُحدَّث آنيًا بالمبلغ نفسه على مستوى قاعدة البيانات (عملية DECIMAL atomic).
        - لا يمكن تعديل حركة مالية — يجب حذفها وإنشاء حركة جديدة.
        - \`dueDate\` يجب أن يكون مساويًا أو بعد \`entryDate\`.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiBody({ type: CreateLedgerEntryDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم تسجيل الحركة المالية بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم تسجيل الحركة المالية بنجاح',
          data: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            companyId: '...',
            partyType: PartyType.CUSTOMER,
            partyId: '...',
            entryType: LedgerEntryType.INVOICE,
            signedAmount: '1500.00',
            entryDate: '2025-01-15',
            dueDate: '2025-02-15',
            note: 'فاتورة مبيعات رقم INV-2025-001',
            createdById: '...',
            isDeleted: false,
            deletedAt: null,
            createdAt: '2025-01-15T10:30:00.000Z',
            updatedAt: '2025-01-15T10:30:00.000Z',
          },
          timestamp: '2025-01-15T10:30:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الطرف (عميل / مورد / موظف) غير موجود في الشركة',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description:
        'بيانات غير صالحة (مبلغ صفر / تاريخ استحقاق قبل تاريخ الحركة)',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية إدارة الحركات المالية',
    }),
  );

// ── Delete Entry ───────────────────────────────────────────────────────────
export const DeleteLedgerEntrySwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إلغاء حركة مالية',
      description: `
        إلغاء (soft delete) حركة مالية وعكس أثرها الكامل على الرصيد.

        **ملاحظات هامة:**
        - العملية atomic: الحذف + عكس الرصيد يتمان في transaction واحدة.
        - إذا كان الرصيد مسبوقاً بحركات أخرى، فإن عكس هذه الحركة وحدها هو الصحيح.
        - الحركة لا تُحذف نهائياً — تبقى في قاعدة البيانات للمراجعة.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({
      name: 'id',
      description: 'معرف الحركة المالية (UUID)',
      type: 'string',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تم إلغاء الحركة المالية وعكس أثرها على الرصيد',
      schema: {
        example: {
          success: true,
          message: 'تم إلغاء الحركة المالية بنجاح',
          data: null,
          timestamp: '2025-01-15T11:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الحركة المالية غير موجودة',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'الحركة المالية محذوفة مسبقاً',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية إدارة الحركات المالية',
    }),
  );

// ── Statement ──────────────────────────────────────────────────────────────
export const GetStatementSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'كشف حساب طرف',
      description: `
        جلب كشف حساب مفصّل لطرف (عميل / مورد / موظف) مع Running Balance لكل صف.

        **بنية الكشف:**
        - \`currentBalance\`: الرصيد الفعلي من جدول الأرصدة (لحظي).
        - \`openingBalanceForPeriod\`: الرصيد عند بداية الفترة المطلوبة.
        - \`closingBalanceForPeriod\`: الرصيد عند نهاية الفترة المطلوبة.
        - \`items[].runningBalance\`: الرصيد التراكمي بعد كل حركة (2 خانات عشرية).

        **دقة الأرقام:**
        كل الحسابات تعتمد \`Prisma.Decimal\` (arbitrary precision) — لا دوار عشري.

        **الترتيب:** دائماً تصاعدياً حسب تاريخ الحركة (chronological).
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiQuery({ name: 'partyType', enum: PartyType, required: true }),
    ApiQuery({ name: 'partyId', description: 'UUID الطرف', required: true }),
    ApiQuery({
      name: 'dateFrom',
      description: 'تاريخ بداية الفترة (YYYY-MM-DD)',
      required: false,
    }),
    ApiQuery({
      name: 'dateTo',
      description: 'تاريخ نهاية الفترة (YYYY-MM-DD)',
      required: false,
    }),
    ApiQuery({ name: 'page', description: 'رقم الصفحة', required: false }),
    ApiQuery({
      name: 'limit',
      description: 'عدد النتائج في الصفحة (max 100)',
      required: false,
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'كشف الحساب مع Running Balance',
      schema: {
        example: {
          success: true,
          message: 'تم جلب كشف الحساب بنجاح',
          data: {
            partyInfo: {
              id: '...',
              name: 'شركة النور للتجارة',
              partyType: PartyType.CUSTOMER,
            },
            currentBalance: '2500.00',
            openingBalanceForPeriod: '1000.00',
            closingBalanceForPeriod: '2500.00',
            items: [
              {
                id: '...',
                entryType: LedgerEntryType.INVOICE,
                signedAmount: '1500.00',
                entryDate: '2025-01-15T00:00:00.000Z',
                dueDate: '2025-02-15T00:00:00.000Z',
                note: 'فاتورة مبيعات',
                createdById: '...',
                createdAt: '2025-01-15T10:30:00.000Z',
                runningBalance: '2500.00',
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
          },
          timestamp: '2025-01-15T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الطرف غير موجود في الشركة',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية عرض الحركات المالية',
    }),
  );

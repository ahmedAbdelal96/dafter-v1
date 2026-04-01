// ============================================================
// Expenses Swagger — Separated Decorators
// ============================================================
// Each decorator is applied to one endpoint in the controller.
// Keeps Swagger descriptions cleanly isolated from HTTP logic.
// ============================================================

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
import { CreateExpenseDto, UpdateExpenseDto } from '../dto';
import { ExpenseCategory } from '@prisma/client';

// ── Module Tag ─────────────────────────────────────────────────────────────

export const ExpensesApiTags = () => ApiTags('💸 Expenses — المصروفات');

// ── Shared example ─────────────────────────────────────────────────────────

const expenseExample = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  companyId: 'c1d2e3f4-...',
  supplierId: null,
  supplier: null,
  category: ExpenseCategory.RENT,
  amount: '3500.00',
  expenseDate: '2024-03-01T00:00:00.000Z',
  description: 'إيجار مخزن مارس',
  referenceNumber: 'REC-001',
  paymentMethod: 'تحويل بنكي',
  notes: null,
  createdById: 'u1...',
  createdBy: { id: 'u1...', fullName: 'أحمد محمد' },
  createdAt: '2024-03-01T08:00:00.000Z',
  updatedAt: '2024-03-01T08:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
};

// ── POST /expenses ──────────────────────────────────────────────────────────

export const CreateExpenseSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تسجيل مصروف جديد',
      description: `
تسجيل مصروف تشغيلي للشركة.

**الفئات المتاحة (ExpenseCategory):**
- RENT — إيجار
- SALARIES — رواتب
- UTILITIES — مرافق (كهرباء / مياه / إنترنت)
- SUPPLIES — مستلزمات / بضاعة
- TRANSPORTATION — مواصلات / شحن
- MAINTENANCE — صيانة
- MARKETING — تسويق وإعلان
- TAXES — ضرائب ورسوم
- OTHER — أخرى

**ملاحظات:**
- \`supplierId\` اختياري — يربط المصروف بمورّد
- \`amount\` يُخزَّن بدقة Decimal(14,2) — لا حسابات JavaScript
- العملية تسجّل AuditLog تلقائياً
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiBody({ type: CreateExpenseDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم تسجيل المصروف بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم تسجيل المصروف بنجاح',
          data: expenseExample,
        },
      },
    }),
    ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'بيانات غير صالحة' }),
    ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'المورّد غير موجود' }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

// ── GET /expenses ───────────────────────────────────────────────────────────

export const ListExpensesSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'قائمة المصروفات (مع فلترة وبحث)',
      description: `
يعيد قائمة مصروفات الشركة مرتّبة تنازلياً حسب تاريخ المصروف.

**خيارات الفلترة:**
- \`category\` — فلتر حسب الفئة
- \`supplierId\` — فلتر حسب المورّد
- \`dateFrom\` / \`dateTo\` — نطاق تاريخي (ISO date)
- \`search\` — بحث نصي في الوصف ورقم المرجع

**Pagination:** page + limit (افتراضي: 1 / 20)
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiQuery({ name: 'category', required: false, enum: ExpenseCategory }),
    ApiQuery({ name: 'supplierId', required: false, type: String, description: 'UUID مورد' }),
    ApiQuery({ name: 'dateFrom', required: false, type: String, example: '2024-01-01' }),
    ApiQuery({ name: 'dateTo', required: false, type: String, example: '2024-12-31' }),
    ApiQuery({ name: 'search', required: false, type: String }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'قائمة مصروفات مُرقَّمة',
      schema: {
        example: {
          success: true,
          message: null,
          data: {
            items: [expenseExample],
            meta: {
              page: 1,
              limit: 20,
              total: 45,
              totalPages: 3,
              hasNext: true,
              hasPrev: false,
            },
          },
        },
      },
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

// ── GET /expenses/summary ───────────────────────────────────────────────────

export const GetExpenseSummarySwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'ملخص المصروفات (إجمالي + تفصيل حسب الفئة)',
      description: `
يعيد إجمالي المصروفات وتوزيعها على الفئات.
يقبل نفس معاملات الفلترة الخاصة بقائمة المصروفات.
يُستخدم لعرض الرسوم البيانية (Pie chart) في لوحة القيادة.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiQuery({ name: 'category', required: false, enum: ExpenseCategory }),
    ApiQuery({ name: 'supplierId', required: false, type: String }),
    ApiQuery({ name: 'dateFrom', required: false, type: String, example: '2024-01-01' }),
    ApiQuery({ name: 'dateTo', required: false, type: String, example: '2024-12-31' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'ملخص المصروفات',
      schema: {
        example: {
          success: true,
          message: null,
          data: {
            totalAmount: '12500.00',
            count: 8,
            byCategory: [
              { category: 'RENT', total: '3500.00', count: 1 },
              { category: 'SALARIES', total: '5000.00', count: 1 },
              { category: 'UTILITIES', total: '800.00', count: 3 },
              { category: 'SUPPLIES', total: '3200.00', count: 3 },
            ],
          },
        },
      },
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

// ── GET /expenses/:id ───────────────────────────────────────────────────────

export const GetExpenseSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'تفاصيل مصروف محدد' }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'UUID المصروف' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تفاصيل المصروف',
      schema: { example: { success: true, message: null, data: expenseExample } },
    }),
    ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'المصروف غير موجود' }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

// ── PATCH /expenses/:id ────────────────────────────────────────────────────

export const UpdateExpenseSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تعديل مصروف',
      description: 'جميع الحقول اختيارية — يتم تحديث ما يُرسَل فقط.',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'UUID المصروف' }),
    ApiBody({ type: UpdateExpenseDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تم تعديل المصروف بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم تعديل المصروف بنجاح',
          data: { ...expenseExample, amount: '4000.00' },
        },
      },
    }),
    ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'المصروف غير موجود' }),
    ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'بيانات غير صالحة' }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

// ── DELETE /expenses/:id ───────────────────────────────────────────────────

export const DeleteExpenseSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'حذف مصروف (soft delete)',
      description: 'يُطبّق soft delete — السجل يُحفَظ في قاعدة البيانات للمراجعة.',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'UUID المصروف' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تم حذف المصروف بنجاح',
      schema: {
        example: { success: true, message: 'تم حذف المصروف بنجاح', data: null },
      },
    }),
    ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'المصروف غير موجود' }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

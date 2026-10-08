// ============================================================
// Products Swagger — Separated Decorators
// ============================================================
// Each function decorates exactly one endpoint in the controller.
// Keeping Swagger annotations here keeps the controller readable.
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
import { CreateProductDto, UpdateProductDto } from '../dto';

// ── Module Tag ─────────────────────────────────────────────────────────────

export const ProductsApiTags = () => ApiTags('📦 Products — كتالوج المنتجات');

// ── Shared example ─────────────────────────────────────────────────────────

const productExample = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  companyId: 'c1d2e3f4-0000-0000-0000-000000000001',
  name: 'كيس أرز 50 كيلو',
  description: 'أرز مصري فاخر درجة أولى، معبأ في أكياس 50 كيلو',
  sku: 'RICE-50KG-001',
  category: 'مواد غذائية',
  unit: 'كيلو',
  unitPrice: '350.00',
  isActive: true,
  isDeleted: false,
  deletedAt: null,
  createdAt: '2026-02-23T08:00:00.000Z',
  updatedAt: '2026-02-23T08:00:00.000Z',
  createdById: 'u1000000-0000-0000-0000-000000000001',
  createdBy: { id: 'u1000000-0000-0000-0000-000000000001', fullName: 'أحمد محمد' },
};

// ── POST /products ─────────────────────────────────────────────────────────

export const CreateProductSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إضافة منتج أو خدمة جديدة للكتالوج',
      description: `
إضافة منتج أو خدمة إلى كتالوج الشركة.

**قواعد:**
- \`name\` مطلوب — حتى 200 حرف
- \`sku\` اختياري، لكن إذا وُجد يجب أن يكون فريداً داخل الشركة (409 إذا مكرر)
- \`category\` نص حر — لا يوجد قائمة ثابتة
- \`unit\` نص حر (قطعة / كيلو / متر / خدمة / إلخ)
- \`unitPrice\` مطلوب — لا يقل عن صفر
- \`isActive\` افتراضياً true — المنتج يظهر في الكتالوج مباشرة
- العملية تسجّل AuditLog تلقائياً
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiBody({ type: CreateProductDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم إضافة المنتج بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم إضافة المنتج بنجاح',
          data: productExample,
        },
      },
    }),
    ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'بيانات غير صالحة' }),
    ApiResponse({ status: HttpStatus.CONFLICT, description: 'يوجد منتج آخر بنفس الكود (SKU)' }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

// ── GET /products ──────────────────────────────────────────────────────────

export const ListProductsSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'قائمة الكتالوج (مع بحث وفلترة)',
      description: `
يعيد قائمة منتجات الشركة مرتّبة أبجدياً بالاسم.

**خيارات الفلترة:**
- \`search\` — بحث نصي في الاسم والكود (SKU) والوصف
- \`category\` — فلتر حسب التصنيف (حساس لحالة الأحرف: insensitive)
- \`isActive\` — true: نشط فقط | false: معطّل فقط | (غير محدد): الكل

**الاستخدام في شاشة إنشاء الفاتورة:**
- أرسل \`isActive=true\` لجلب المنتجات النشطة فقط
- استخدم \`search\` لبحث live أثناء الكتابة
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiQuery({ name: 'search', required: false, type: String, description: 'بحث في الاسم / SKU / الوصف' }),
    ApiQuery({ name: 'category', required: false, type: String, description: 'فلتر التصنيف' }),
    ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'true | false | (الكل)' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'قائمة منتجات مُرقَّمة',
      schema: {
        example: {
          success: true,
          message: null,
          data: {
            items: [productExample],
            meta: {
              page: 1,
              limit: 20,
              total: 12,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        },
      },
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

// ── GET /products/:id ──────────────────────────────────────────────────────

export const GetProductSwagger = () =>
  applyDecorators(
    ApiOperation({ summary: 'تفاصيل منتج محدد' }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'UUID المنتج', type: String }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تفاصيل المنتج',
      schema: {
        example: {
          success: true,
          message: null,
          data: productExample,
        },
      },
    }),
    ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'المنتج غير موجود' }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

// ── PATCH /products/:id ───────────────────────────────────────────────────

export const UpdateProductSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تعديل منتج',
      description: `
جميع الحقول اختيارية — يُحدَّث ما يُرسَل فقط.

**ملاحظات:**
- إرسال \`sku: null\` يحذف الكود من المنتج.
- إرسال \`isActive: false\` يعطّل المنتج (يخفيه من الكتالوج دون حذفه).
- تغيير \`sku\` إلى قيمة مستخدمة بالفعل يعيد 409.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'UUID المنتج', type: String }),
    ApiBody({ type: UpdateProductDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تم تعديل المنتج بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم تعديل المنتج بنجاح',
          data: { ...productExample, unitPrice: '400.00', isActive: false },
        },
      },
    }),
    ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'المنتج غير موجود' }),
    ApiResponse({ status: HttpStatus.CONFLICT, description: 'يوجد منتج آخر بنفس الكود (SKU)' }),
    ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'بيانات غير صالحة' }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

// ── DELETE /products/:id ──────────────────────────────────────────────────

export const DeleteProductSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'حذف منتج (soft delete)',
      description: `
يطبّق soft delete — السجل يُحفَظ في قاعدة البيانات.

**لماذا soft delete؟**
المنتجات المحذوفة قد تكون مرتبطة بعناصر فواتير قديمة (Phase K).
الحفاظ عليها يمنع تلف البيانات التاريخية.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'UUID المنتج', type: String }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تم حذف المنتج بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم حذف المنتج بنجاح',
          data: null,
        },
      },
    }),
    ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'المنتج غير موجود' }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'لا تملك صلاحية' }),
  );

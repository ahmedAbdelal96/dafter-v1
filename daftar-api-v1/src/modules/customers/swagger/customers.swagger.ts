// ============================================
// Customers Swagger Decorators
// ============================================
// Separated from controller to keep HTTP layer clean.
// Each export = one endpoint decorator.
// ============================================

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
import { CreateCustomerDto, UpdateCustomerDto } from '../dto';

// ── Module Tag ─────────────────────────────────────────────────────────────
export const CustomersApiTags = () => ApiTags('👥 Customers — العملاء');

// ── POST /customers ─────────────────────────────────────────────────────────
export const CreateCustomerSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إنشاء عميل جديد',
      description: `
        إنشاء عميل جديد مع تهيئة الرصيد الافتتاحي تلقائياً.

        **القواعد:**
        - الاسم يجب أن يكون فريداً داخل الشركة
        - الرصيد الافتتاحي يُسجل فوراً في جدول الأرصدة (Balance)
        - يتطلب اشتراكاً نشطاً
        - Staff يحتاج صلاحية \`manageParties\`
      `,
    }),
    ApiBearerAuth(),
    ApiBody({ type: CreateCustomerDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم إنشاء العميل بنجاح',
      schema: {
        example: {
          success: true,
          data: {
            id: 'uuid',
            companyId: 'uuid',
            name: 'أحمد محمد التاجر',
            phone: '01012345678',
            address: null,
            openingBalance: '500.00',
            creditLimit: null,
            isActive: true,
            version: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          message: 'تم إنشاء العميل بنجاح',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'اسم العميل موجود بالفعل أو تجاوز الحد',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'تجاوز الحد الأقصى في خطة الاشتراك',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'بيانات غير صالحة',
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'توكن مفقود أو منتهي',
    }),
  );

// ── GET /customers ──────────────────────────────────────────────────────────
export const ListCustomersSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'قائمة العملاء',
      description: `
        جلب قائمة العملاء مع البحث والتصفية والتصفح بالصفحات.
        يتضمن الرصيد الحالي لكل عميل.

        **Staff يحتاج صلاحية \`viewParties\`**
      `,
    }),
    ApiBearerAuth(),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiQuery({
      name: 'search',
      required: false,
      description: 'بحث بالاسم أو الهاتف',
      example: 'أحمد',
    }),
    ApiQuery({
      name: 'isActive',
      required: false,
      description: 'true = نشط فقط',
      example: true,
    }),
    ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'قائمة العملاء مع الأرصدة',
      schema: {
        example: {
          success: true,
          data: [
            {
              id: 'uuid',
              name: 'أحمد محمد',
              phone: '01012345678',
              balance: '1500.00',
              isActive: true,
              version: 2,
            },
          ],
          meta: {
            page: 1,
            limit: 10,
            total: 45,
            totalPages: 5,
            hasNext: true,
            hasPrev: false,
          },
          message: 'تم جلب قائمة العملاء',
          error: null,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
  );

// ── GET /customers/:id ──────────────────────────────────────────────────────
export const GetCustomerSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تفاصيل عميل',
      description:
        'جلب بيانات عميل واحد مع رصيده الحالي. Staff يحتاج صلاحية `viewParties`',
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'معرف العميل (UUID)', type: String }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'بيانات العميل',
      schema: {
        example: {
          success: true,
          data: {
            id: 'uuid',
            name: 'أحمد محمد',
            balance: '1500.00',
            version: 2,
          },
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'العميل غير موجود',
    }),
  );

// ── PATCH /customers/:id ────────────────────────────────────────────────────
export const UpdateCustomerSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تعديل بيانات عميل',
      description: `
        تعديل بيانات عميل مع حماية التزامن المتفائل.

        **مطلوب:** \`version\` — يُجلب من GET /:id ثم يُرسل مع الـ PATCH.
        إذا تغير السجل من مستخدم آخر → 409 Conflict.

        **Staff يحتاج صلاحية \`manageParties\`**
      `,
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'معرف العميل (UUID)', type: String }),
    ApiBody({ type: UpdateCustomerDto }),
    ApiResponse({ status: HttpStatus.OK, description: 'تم التعديل بنجاح' }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'العميل غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'اسم مكرر أو version mismatch (تعديل متزامن)',
    }),
  );

// ── DELETE /customers/:id ───────────────────────────────────────────────────
export const DeleteCustomerSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'حذف عميل (ناعم)',
      description: `
        حذف ناعم — البيانات لا تُحذف فعلياً للحفاظ على سلامة الدفاتر.

        **القيود:**
        - لا يُسمح بحذف عميل لديه حركات مالية (استخدم تعطيله بدلاً من ذلك)
        - حصري للـ Owner فقط
      `,
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'معرف العميل (UUID)', type: String }),
    ApiResponse({ status: HttpStatus.OK, description: 'تم الحذف بنجاح' }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'العميل غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'لديه حركات مالية — استخدم التعطيل',
    }),
  );

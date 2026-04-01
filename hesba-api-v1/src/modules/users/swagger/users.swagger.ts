// ============================================
// Users Swagger Decorators
// ============================================
// Centralized Swagger documentation for the Users module.
// Owner manages Staff accounts and permissions.
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
import { CreateStaffDto } from '../dto/create-staff.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdatePermissionsDto } from '../dto/update-permissions.dto';
import { UserStatus } from '@prisma/client';

// ── Tag applied to entire controller ──
export const UsersApiTags = () => ApiTags('👥 Users — إدارة المستخدمين');

// ══════════════════════════════════════════════
// CREATE STAFF
// ══════════════════════════════════════════════

export const CreateStaffSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'إضافة موظف جديد (المالك فقط)',
      description: `
يُنشئ حساب موظف جديد مرتبط بنفس الشركة.

**ما يحصل:**
1. التحقق من تفرد البريد الإلكتروني (system-wide)
2. التحقق من عدم تجاوز الحد الأقصى للمستخدمين في الخطة
3. تشفير كلمة المرور (bcrypt)
4. إنشاء المستخدم + صلاحياته في transaction واحدة
5. تسجيل AuditLog

**الصلاحيات المتاحة:**
- \`manageUsers\` — إدارة الموظفين
- \`manageParties\` — إدارة الأطراف (عملاء / موردين)
- \`manageLedger\` — إدارة دفتر الحسابات
- \`viewReports\` — عرض التقارير
      `,
    }),
    ApiBody({ type: CreateStaffDto }),
    ApiResponse({
      status: 201,
      description: 'تم إنشاء الموظف بنجاح',
      schema: {
        example: {
          success: true,
          data: {
            id: 'uuid',
            fullName: 'سارة محمد',
            email: 'sara@company.com',
            role: 'STAFF',
            status: 'ACTIVE',
            permissions: {
              manageUsers: false,
              manageParties: true,
              manageLedger: true,
              viewReports: true,
            },
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          message: 'تم إنشاء المستخدم بنجاح',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'البريد الإلكتروني مستخدم بالفعل',
      schema: {
        example: {
          success: false,
          statusCode: 400,
          message: 'البريد الإلكتروني مستخدم بالفعل',
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'تم الوصول للحد الأقصى لعدد المستخدمين',
      schema: {
        example: {
          success: false,
          statusCode: 403,
          message: 'تم الوصول للحد الأقصى لعدد المستخدمين في خطتك الحالية',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'غير مصرح — JWT مطلوب' }),
  );

// ══════════════════════════════════════════════
// LIST USERS
// ══════════════════════════════════════════════

export const ListUsersSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'قائمة مستخدمي الشركة',
      description: `
يجلب جميع المستخدمين المرتبطين بنفس الشركة مع دعم البحث والفلترة.

**الوصول:**
- المالك يرى جميع المستخدمين
- الموظف يحتاج صلاحية \`manageUsers\` لعرض القائمة
      `,
    }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiQuery({
      name: 'search',
      required: false,
      description: 'البحث بالاسم أو البريد',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: UserStatus,
      description: 'تصفية حسب الحالة',
    }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      example: 'createdAt',
    }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    ApiResponse({
      status: 200,
      description: 'تم جلب قائمة المستخدمين',
      schema: {
        example: {
          success: true,
          data: [
            {
              id: 'uuid',
              fullName: 'سارة محمد',
              email: 'sara@company.com',
              role: 'STAFF',
              status: 'ACTIVE',
              permissions: {
                manageUsers: false,
                manageParties: true,
                manageLedger: true,
                viewReports: true,
              },
            },
          ],
          meta: {
            total: 5,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
          },
          message: 'تم جلب قائمة المستخدمين',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'غير مصرح — JWT مطلوب' }),
  );

// ══════════════════════════════════════════════
// GET ONE USER
// ══════════════════════════════════════════════

export const GetUserSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'عرض بيانات مستخدم واحد',
      description: 'يجلب بيانات مستخدم بالـ ID مع صلاحياته. مقيد بنفس الشركة.',
    }),
    ApiParam({
      name: 'id',
      description: 'معرف المستخدم (UUID)',
      example: 'uuid',
    }),
    ApiResponse({
      status: 200,
      description: 'تم جلب بيانات المستخدم',
    }),
    ApiResponse({ status: 404, description: 'المستخدم غير موجود' }),
    ApiResponse({ status: 401, description: 'غير مصرح — JWT مطلوب' }),
  );

// ══════════════════════════════════════════════
// UPDATE USER
// ══════════════════════════════════════════════

export const UpdateUserSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'تعديل بيانات مستخدم (المالك فقط)',
      description: `
يُعدّل الاسم ورقم الهاتف فقط.
تغيير البريد الإلكتروني وكلمة المرور يتم عبر endpoints منفصلة.
      `,
    }),
    ApiParam({
      name: 'id',
      description: 'معرف المستخدم (UUID)',
      example: 'uuid',
    }),
    ApiBody({ type: UpdateUserDto }),
    ApiResponse({ status: 200, description: 'تم تحديث بيانات المستخدم بنجاح' }),
    ApiResponse({ status: 404, description: 'المستخدم غير موجود' }),
    ApiResponse({ status: 401, description: 'غير مصرح — JWT مطلوب' }),
  );

// ══════════════════════════════════════════════
// UPDATE PERMISSIONS
// ══════════════════════════════════════════════

export const UpdatePermissionsSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'تعديل صلاحيات موظف (المالك فقط)',
      description: `
يُعدّل صلاحيات موظف محدد. لا يمكن تعديل صلاحيات المالك.

**الصلاحيات:**
- \`manageUsers\` — إدارة الموظفين
- \`manageParties\` — إدارة الأطراف
- \`manageLedger\` — إدارة دفتر الحسابات
- \`viewReports\` — عرض التقارير
      `,
    }),
    ApiParam({
      name: 'id',
      description: 'معرف المستخدم (UUID)',
      example: 'uuid',
    }),
    ApiBody({ type: UpdatePermissionsDto }),
    ApiResponse({ status: 200, description: 'تم تحديث الصلاحيات بنجاح' }),
    ApiResponse({ status: 400, description: 'لا يمكن تعديل صلاحيات المالك' }),
    ApiResponse({ status: 404, description: 'المستخدم غير موجود' }),
    ApiResponse({ status: 401, description: 'غير مصرح — JWT مطلوب' }),
  );

// ══════════════════════════════════════════════
// DISABLE USER
// ══════════════════════════════════════════════

export const DisableUserSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'تعطيل حساب مستخدم (المالك فقط)',
      description: `
يُعطّل حساب المستخدم بشكل ناعم (Soft Disable) — لا يُحذف.

**قيود:**
- لا يمكن تعطيل آخر مالك نشط في الشركة (لتجنب قفل الحساب)
- العملية idempotent — أي تعطيل حساب معطل مسبقاً لا يُسبب خطأ
      `,
    }),
    ApiParam({
      name: 'id',
      description: 'معرف المستخدم (UUID)',
      example: 'uuid',
    }),
    ApiResponse({ status: 200, description: 'تم تعطيل المستخدم بنجاح' }),
    ApiResponse({
      status: 400,
      description: 'لا يمكن تعطيل آخر مالك في المنشأة',
    }),
    ApiResponse({ status: 404, description: 'المستخدم غير موجود' }),
    ApiResponse({ status: 401, description: 'غير مصرح — JWT مطلوب' }),
  );

// ══════════════════════════════════════════════
// ENABLE USER
// ══════════════════════════════════════════════

export const EnableUserSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'إعادة تفعيل حساب مستخدم (المالك فقط)',
      description: `
يُعيد تفعيل حساب مستخدم مُعطَّل مسبقاً.

**قيود:**
- إذا كان المستخدم فعالاً بالفعل، تُعاد بياناته بدون خطأ (idempotent)
- يتحقق من حد الخطة قبل إعادة التفعيل — إذا وصل العدد للحد الأقصى يُرفض الطلب
      `,
    }),
    ApiParam({
      name: 'id',
      description: 'معرف المستخدم (UUID)',
      example: 'uuid',
    }),
    ApiResponse({ status: 200, description: 'تم إعادة تفعيل المستخدم بنجاح' }),
    ApiResponse({
      status: 403,
      description: 'تم الوصول للحد الأقصى لعدد المستخدمين في خطتك',
    }),
    ApiResponse({ status: 404, description: 'المستخدم غير موجود' }),
    ApiResponse({ status: 401, description: 'غير مصرح — JWT مطلوب' }),
  );

// ══════════════════════════════════════════════
// GET STATS
// ══════════════════════════════════════════════

export const GetUsersStatsSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'إحصائيات المستخدمين (المالك فقط)',
      description:
        'يجلب عدد المستخدمين الكلي، النشطين، المعطلين، التوزيع حسب الدور.',
    }),
    ApiResponse({
      status: 200,
      description: 'تم جلب إحصائيات المستخدمين',
      schema: {
        example: {
          success: true,
          data: {
            total: 10,
            active: 8,
            disabled: 2,
            staff: 9,
            owners: 1,
          },
          message: 'تم جلب إحصائيات المستخدمين',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'غير مصرح — JWT مطلوب' }),
  );

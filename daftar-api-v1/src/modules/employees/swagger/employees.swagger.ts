// ============================================
// Employees Swagger — Separated Decorators
// ============================================

import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto';

// ── Module Tag ─────────────────────────────────────────────────────────────
export const EmployeesApiTags = () => ApiTags('👷 Employees — الموظفون');

// ── Create ─────────────────────────────────────────────────────────────────
export const CreateEmployeeSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إنشاء موظف جديد',
      description: `
        إنشاء موظف جديد للشركة مع تهيئة الرصيد الافتتاحي.
        - الاسم يجب أن يكون فريداً داخل الشركة.
        - الرصيد الافتتاحي يُسجل تلقائياً في جدول الأرصدة.
        - يُفحص حد الخطة (maxEmployees) قبل الإنشاء.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiBody({ type: CreateEmployeeDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم إنشاء الموظف بنجاح',
      schema: {
        example: {
          success: true,
          data: {
            id: 'uuid',
            name: 'أحمد محمد علي',
            phone: '01012345678',
            jobTitle: 'مندوب مبيعات',
            openingBalance: '0.00',
            isActive: true,
            version: 0,
          },
          message: 'تم إنشاء الموظف بنجاح',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'اسم الموظف موجود بالفعل',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'تم تجاوز الحد الأقصى لعدد الموظفين في الخطة',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'بيانات غير صالحة',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
  );

// ── List ───────────────────────────────────────────────────────────────────
export const ListEmployeesSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'قائمة الموظفين',
      description: 'جلب قائمة الموظفين مع البحث والتصفية والتصفح بالصفحات.',
    }),
    ApiBearerAuth('access-token'),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'قائمة الموظفين',
      schema: {
        example: {
          success: true,
          data: [
            {
              id: 'uuid',
              name: 'أحمد محمد علي',
              jobTitle: 'مندوب مبيعات',
              balance: '500.00',
              isActive: true,
            },
          ],
          meta: {
            page: 1,
            limit: 20,
            total: 5,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
  );

// ── Get One ────────────────────────────────────────────────────────────────
export const GetEmployeeSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تفاصيل موظف',
      description: 'جلب بيانات موظف واحد بالمعرف مع رصيده الحالي',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'معرف الموظف (UUID)', type: String }),
    ApiResponse({ status: HttpStatus.OK, description: 'بيانات الموظف' }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الموظف غير موجود',
    }),
  );

// ── Update ─────────────────────────────────────────────────────────────────
export const UpdateEmployeeSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تعديل موظف',
      description: 'تعديل بيانات موظف موجود مع Optimistic Locking',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'معرف الموظف (UUID)', type: String }),
    ApiBody({ type: UpdateEmployeeDto }),
    ApiResponse({ status: HttpStatus.OK, description: 'تم التعديل بنجاح' }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الموظف غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'تعارض في البيانات (اسم مكرر أو version mismatch)',
    }),
  );

// ── Delete ─────────────────────────────────────────────────────────────────
export const DeleteEmployeeSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'حذف موظف',
      description: 'حذف ناعم — يُمنع إذا كان للموظف حركات مالية',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'معرف الموظف (UUID)', type: String }),
    ApiResponse({ status: HttpStatus.OK, description: 'تم الحذف بنجاح' }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الموظف غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'لا يمكن الحذف — للموظف حركات مالية',
    }),
  );

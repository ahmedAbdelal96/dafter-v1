// ============================================
// Suppliers Swagger Decorators
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
import { CreateSupplierDto, UpdateSupplierDto } from '../dto';

export const SuppliersApiTags = () => ApiTags('🏭 Suppliers — الموردين');

export const CreateSupplierSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إنشاء مورد جديد',
      description: `
        إنشاء مورد جديد للشركة مع تهيئة الرصيد الافتتاحي.
        - الاسم يجب أن يكون فريداً داخل الشركة.
        - الرصيد الافتتاحي يُسجل تلقائياً في جدول Balance.
        - يتطلب اشتراك نشط.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiBody({ type: CreateSupplierDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم إنشاء المورد بنجاح',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'اسم المورد موجود بالفعل',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'تجاوز الحد الأقصى لعدد الموردين أو لا يملك الصلاحية',
    }),
  );

export const ListSuppliersSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'قائمة الموردين',
      description: 'جلب قائمة الموردين مع البحث والترتيب والتصفح بالصفحات.',
    }),
    ApiBearerAuth('access-token'),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'قائمة الموردين',
      schema: {
        example: {
          success: true,
          data: {
            items: [
              {
                id: 'uuid',
                name: 'شركة الأمل للتوريدات',
                balance: 5000,
              },
            ],
            meta: {
              page: 1,
              limit: 20,
              total: 50,
              totalPages: 3,
              hasNext: true,
              hasPrev: false,
            },
          },
        },
      },
    }),
  );

export const GetSupplierSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تفاصيل مورد',
      description: 'جلب بيانات مورد واحد بالمعرف + رصيده الحالي',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'معرف المورد (UUID)', type: String }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'بيانات المورد + الرصيد',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'المورد غير موجود',
    }),
  );

export const UpdateSupplierSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تعديل مورد',
      description: `
        تعديل بيانات مورد موجود.
        يتطلب إرسال \`version\` من بيانات GET لحماية التزامن.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'معرف المورد (UUID)', type: String }),
    ApiBody({ type: UpdateSupplierDto }),
    ApiResponse({ status: HttpStatus.OK, description: 'تم التعديل بنجاح' }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'المورد غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'اسم مكرر أو تعديل متزامن (version mismatch)',
    }),
  );

export const DeleteSupplierSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'حذف مورد (ناعم)',
      description: 'حذف ناعم — يُمنع إذا كان للمورد حركات مالية.',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({ name: 'id', description: 'معرف المورد (UUID)', type: String }),
    ApiResponse({ status: HttpStatus.OK, description: 'تم الحذف بنجاح' }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'المورد غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'المورد لديه حركات مالية — لا يمكن حذفه',
    }),
  );

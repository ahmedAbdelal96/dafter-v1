// ============================================================
// Deferred Sales Swagger — Separated Decorators
// ============================================================
// كل decorator يُطبَّق على endpoint واحد في الكنترولر.
// يعزل وصف Swagger عن منطق الـ HTTP.
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
import { CreateDeferredSaleDto, RecordDeferredPaymentDto } from '../dto';
import { PartyType, DeferredSaleStatus } from '@prisma/client';

// ── Module Tag ─────────────────────────────────────────────────────────────

/**
 * تعريف Tag الموديول في Swagger UI
 */
export const DeferredSalesApiTags = () =>
  ApiTags('💰 Deferred Sales — البيوع الآجلة');

// ── Create Deferred Sale ────────────────────────────────────────────────────

/**
 * Swagger decorator لـ POST /deferred-sales
 */
export const CreateDeferredSaleSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إنشاء بيع آجل جديد',
      description: `
        تسجيل بيع بالأجل (بيع آجل) لطرف معين (عميل / مورد / موظف).

        **الخطوات الداخلية (atomic $transaction):**
        - إنشاء حركة مالية INVOICE بمبلغ موجب (+totalAmount) في دفتر الأستاذ
        - إنشاء سجل DeferredSale مع رقم مرجعي تلقائي بصيغة DEF-{YEAR}-{NNNN}
        - زيادة رصيد الطرف بمبلغ الفاتورة (DB-level increment)
        - تسجيل AuditLog

        **قواعد المبلغ:**
        - يجب أن يكون أكبر من صفر
        - يُخزَّن بدقة Decimal(14,2) — لا حسابات في JavaScript

        **حالة البيع الافتراضية:** PENDING
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiBody({ type: CreateDeferredSaleDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم إنشاء البيع الآجل بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم إنشاء البيع الآجل بنجاح',
          data: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            companyId: '...',
            partyType: PartyType.CUSTOMER,
            partyId: '...',
            ledgerEntryId: '...',
            referenceNumber: 'DEF-2024-0001',
            description: 'بضاعة أقمشة',
            totalAmount: '5000.00',
            paidAmount: '0.00',
            dueDate: '2024-03-15T00:00:00.000Z',
            status: DeferredSaleStatus.PENDING,
            createdById: '...',
            version: 0,
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:30:00.000Z',
            isDeleted: false,
            deletedAt: null,
          },
          timestamp: '2024-01-15T10:30:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الطرف (عميل / مورد / موظف) غير موجود في الشركة',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'بيانات غير صالحة (مبلغ صفر / تاريخ الاستحقاق قبل تاريخ الإنشاء)',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية إنشاء بيوع آجلة',
    }),
  );

// ── List Deferred Sales ─────────────────────────────────────────────────────

/**
 * Swagger decorator لـ GET /deferred-sales
 */
export const ListDeferredSalesSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'قائمة البيوع الآجلة',
      description: `
        جلب قائمة مُصفَّحة من البيوع الآجلة مع دعم التصفية المتعددة.

        **خيارات التصفية:**
        - \`partyType\`: تصفية بنوع الطرف
        - \`partyId\`: تصفية بمعرف الطرف
        - \`status\`: تصفية بالحالة (PENDING / PARTIAL / PAID / OVERDUE)
        - \`dateFrom\` / \`dateTo\`: تصفية بتاريخ الاستحقاق
        - \`search\`: بحث نصي في رقم المرجع والوصف

        **المبلغ المتبقي:** مُحسَّب بـ Prisma.Decimal — عرض فقط
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiQuery({
      name: 'partyType',
      enum: PartyType,
      required: false,
      description: 'تصفية حسب نوع الطرف',
    }),
    ApiQuery({
      name: 'partyId',
      required: false,
      description: 'UUID الطرف',
    }),
    ApiQuery({
      name: 'status',
      enum: DeferredSaleStatus,
      required: false,
      description: 'تصفية حسب الحالة',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      description: 'تاريخ بداية الاستحقاق (YYYY-MM-DD)',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      description: 'تاريخ نهاية الاستحقاق (YYYY-MM-DD)',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      description: 'بحث نصي في رقم المرجع أو الوصف',
    }),
    ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة' }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'عدد النتائج في الصفحة (max 100)',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'قائمة البيوع الآجلة',
      schema: {
        example: {
          success: true,
          message: 'تم جلب البيوع الآجلة بنجاح',
          data: {
            items: [
              {
                id: '...',
                referenceNumber: 'DEF-2024-0001',
                partyType: PartyType.CUSTOMER,
                partyId: '...',
                totalAmount: '5000.00',
                paidAmount: '1500.00',
                remaining: '3500.00',
                dueDate: '2024-03-15T00:00:00.000Z',
                status: DeferredSaleStatus.PARTIAL,
                createdAt: '2024-01-15T10:30:00.000Z',
              },
            ],
            total: 1,
            page: 1,
            limit: 10,
          },
          timestamp: '2024-01-15T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية عرض البيوع الآجلة',
    }),
  );

// ── Get One Deferred Sale ───────────────────────────────────────────────────

/**
 * Swagger decorator لـ GET /deferred-sales/:id
 */
export const GetDeferredSaleSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'جلب بيع آجل بمعرفه',
      description: `
        جلب تفاصيل بيع آجل واحد مع:
        - قائمة الدفعات المسجّلة
        - اسم الطرف
        - المبلغ المتبقي (عرض فقط — Prisma.Decimal)
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({
      name: 'id',
      description: 'معرف البيع الآجل (UUID)',
      type: 'string',
      format: 'uuid',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تفاصيل البيع الآجل مع الدفعات',
      schema: {
        example: {
          success: true,
          message: 'تم جلب البيع الآجل بنجاح',
          data: {
            id: '...',
            referenceNumber: 'DEF-2024-0001',
            partyType: PartyType.CUSTOMER,
            partyId: '...',
            partyName: 'شركة النور للتجارة',
            totalAmount: '5000.00',
            paidAmount: '1500.00',
            remaining: '3500.00',
            dueDate: '2024-03-15T00:00:00.000Z',
            status: DeferredSaleStatus.PARTIAL,
            payments: [
              {
                id: '...',
                amount: '1500.00',
                paymentDate: '2024-02-01T00:00:00.000Z',
                paymentMethod: 'تحويل بنكي',
                notes: 'دفعة أولى',
                createdAt: '2024-02-01T09:00:00.000Z',
              },
            ],
            createdAt: '2024-01-15T10:30:00.000Z',
          },
          timestamp: '2024-02-15T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'البيع الآجل غير موجود',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية عرض البيوع الآجلة',
    }),
  );

// ── Record Payment ──────────────────────────────────────────────────────────

/**
 * Swagger decorator لـ POST /deferred-sales/:id/payments
 */
export const RecordPaymentSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تسجيل دفعة على بيع آجل',
      description: `
        تسجيل دفعة جزئية أو كاملة على بيع آجل موجود.

        **قواعد الدفعة:**
        - مبلغ الدفعة يجب أن يكون > 0
        - مبلغ الدفعة يجب أن لا يتجاوز المبلغ المتبقي
        - لا يمكن التسجيل إذا كان البيع مدفوعاً كاملاً (PAID)

        **الخطوات الداخلية (atomic $transaction):**
        - إنشاء حركة مالية PAYMENT بمبلغ سالب (-amount) في دفتر الأستاذ
        - إنشاء سجل DeferredPayment
        - زيادة paidAmount بـ DB-level increment
        - تحديث status: PAID / OVERDUE / PARTIAL
        - تقليل رصيد الطرف بمبلغ الدفعة (DB-level decrement)
        - تسجيل AuditLog
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({
      name: 'id',
      description: 'معرف البيع الآجل (UUID)',
      type: 'string',
      format: 'uuid',
    }),
    ApiBody({ type: RecordDeferredPaymentDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم تسجيل الدفعة بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم تسجيل الدفعة بنجاح',
          data: {
            payment: {
              id: '...',
              deferredSaleId: '...',
              amount: '1500.00',
              paymentDate: '2024-02-01T00:00:00.000Z',
              paymentMethod: 'تحويل بنكي',
              notes: 'دفعة أولى',
              createdAt: '2024-02-01T09:00:00.000Z',
            },
            sale: {
              id: '...',
              referenceNumber: 'DEF-2024-0001',
              paidAmount: '1500.00',
              status: DeferredSaleStatus.PARTIAL,
              version: 1,
            },
          },
          timestamp: '2024-02-01T09:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'البيع الآجل غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'البيع مدفوع كاملاً / مبلغ الدفعة يتجاوز المتبقي',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية تسجيل دفعات',
    }),
  );

// ── Cancel Deferred Sale ────────────────────────────────────────────────────

/**
 * Swagger decorator لـ PATCH /deferred-sales/:id/cancel
 */
export const CancelDeferredSaleSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إلغاء بيع آجل (المالك فقط)',
      description: `
        إلغاء بيع آجل وعكس الرصيد المتبقي. هذه العملية للمالك فقط.

        **قواعد الإلغاء:**
        - لا يمكن إلغاء بيع مدفوع كاملاً (status === PAID)
        - يتم عكس المبلغ المتبقي فقط (totalAmount - paidAmount)
          لأن الدفعات المسجّلة مسبقاً قد خفّضت الرصيد بالفعل

        **الخطوات الداخلية (atomic $transaction):**
        - Soft-delete DeferredSale (isDeleted=true)
        - عكس الرصيد المتبقي (DB-level decrement)
        - Soft-delete حركة INVOICE المرتبطة
        - تسجيل AuditLog
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({
      name: 'id',
      description: 'معرف البيع الآجل (UUID)',
      type: 'string',
      format: 'uuid',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تم إلغاء البيع الآجل بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم إلغاء البيع الآجل بنجاح',
          data: null,
          timestamp: '2024-03-01T14:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'البيع الآجل غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'لا يمكن إلغاء بيع مدفوع كاملاً',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'هذه العملية للمالك فقط',
    }),
  );

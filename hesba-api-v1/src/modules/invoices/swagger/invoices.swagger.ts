// ============================================================
// Invoices Swagger Decorators (separated from controller for cleanliness)
// ============================================================

import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateInvoiceDto } from '../dto';

// ── Module tag ──────────────────────────────────────────────────────────────

export const InvoicesApiTags = () => ApiTags('🧾 Invoices — الفواتير');

// ── POST /invoices ───────────────────────────────────────────────────────────

export const CreateInvoiceSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إنشاء فاتورة يدوياً',
      description: `
إنشاء فاتورة لعميل أو مورد يدوياً.

**رقم الفاتورة:** يتولد تلقائياً بصيغة \`INV-YYYY-NNNN\` من الخادم.

**طريقتا إضافة بند:**
- **من الكتالوج:** أرسل \`productId\` + \`description\` + \`unitPrice\`. السعر في الفاتورة مستقل عن سعر الكتالوج (يمكن تعديله).
- **يدوياً:** أرسل \`description\` + \`unitPrice\` فقط بدون \`productId\`.

**الإجمالي:** يُحسَب تلقائياً من الخادم = SUM(بنود) + ضريبة.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiBody({ type: CreateInvoiceDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم إنشاء الفاتورة بنجاح',
      schema: {
        example: {
          success: true,
          data: {
            id: 'uuid',
            invoiceNumber: 'INV-2026-0001',
            partyName: 'أحمد محمد',
            totalAmount: '900.00',
            taxAmount: '0.00',
            issueDate: '2026-02-23T00:00:00.000Z',
            items: [
              {
                description: 'كيس أرز 50 كيلو',
                quantity: '2.000',
                unitPrice: '350.00',
                total: '700.00',
              },
              {
                description: 'شحن بضاعة للإسكندرية',
                quantity: '1.000',
                unitPrice: '200.00',
                total: '200.00',
              },
            ],
          },
          message: 'تم إنشاء الفاتورة بنجاح',
          timestamp: '2026-02-23T10:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الطرف أو المنتج غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'بيانات غير صالحة (validation error)',
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'توكن مفقود أو منتهي',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية إنشاء الفواتير',
    }),
  );

// ── POST /invoices/from-deferred-sale/:saleId ────────────────────────────────

export const CreateFromDeferredSaleSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'توليد فاتورة من بيع آجل',
      description: `
يُولِّد فاتورة تلقائياً من بيع آجل موجود.

**ملاحظات:**
- رقم الفاتورة يتولد تلقائياً.
- البيانات (اسم الطرف، المبلغ، الوصف) تُؤخذ من البيع الآجل كـ snapshot.
- كل بيع آجل ينتج فاتورة واحدة فقط — ثانية تُرجع 409.
- إلغاء الفاتورة لاحقاً لا يؤثر على البيع الآجل نفسه.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({
      name: 'saleId',
      description: 'معرف البيع الآجل (UUID)',
      type: String,
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم توليد الفاتورة بنجاح',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'البيع الآجل غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'تم إنشاء فاتورة لهذا البيع مسبقاً',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية إنشاء الفواتير',
    }),
  );

// ── GET /invoices ────────────────────────────────────────────────────────────

export const ListInvoicesSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'قائمة الفواتير',
      description:
        'جلب قائمة الفواتير مع التصفية والبحث والتصفح بالصفحات. ' +
        'البنود غير مضمّنة في القائمة — استخدم /invoices/:id للتفاصيل الكاملة.',
    }),
    ApiBearerAuth('access-token'),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'قائمة الفواتير',
      schema: {
        example: {
          success: true,
          data: {
            items: [
              {
                id: 'uuid',
                invoiceNumber: 'INV-2026-0001',
                partyName: 'أحمد محمد',
                partyType: 'CUSTOMER',
                totalAmount: '900.00',
                issueDate: '2026-02-23T00:00:00.000Z',
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
          },
          timestamp: '2026-02-23T10:00:00.000Z',
        },
      },
    }),
  );

// ── GET /invoices/:id ────────────────────────────────────────────────────────

export const GetInvoiceSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تفاصيل الفاتورة (مع البنود)',
      description: 'جلب الفاتورة كاملة بجميع بنودها — تُستخدم لعرض الفاتورة أو مشاركتها.',
    }),
    ApiBearerAuth('access-token'),
    ApiParam({
      name: 'id',
      description: 'معرف الفاتورة (UUID)',
      type: String,
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تفاصيل الفاتورة مع البنود',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الفاتورة غير موجودة',
    }),
  );

// ── DELETE /invoices/:id ──────────────────────────────────────────────────────

export const DeleteInvoiceSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إلغاء فاتورة (حذف ناعم)',
      description: `
إلغاء فاتورة موجودة.

**ملاحظات:**
- الحذف ناعم (soft delete) — تُحفظ الفاتورة للتدقيق.
- إلغاء الفاتورة لا يؤثر على البيع الآجل المرتبط بها.
- يُسمح للمالك فقط بالإلغاء.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({
      name: 'id',
      description: 'معرف الفاتورة (UUID)',
      type: String,
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تم إلغاء الفاتورة بنجاح',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الفاتورة غير موجودة',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'عملية محصورة بالمالك فقط',
    }),
  );

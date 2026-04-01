// ============================================================
// Installments Swagger — Separated Decorators
// ============================================================
//
// كل دالة تُرجع مُزخرفاً (decorator factory) مُركَّباً من
// عدة مُزخرفات Swagger لتوثيق كل نقطة نهاية.
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
import { CreateContractDto } from '../dto/create-contract.dto';
import { RecordInstallmentPaymentDto } from '../dto/record-installment-payment.dto';
import {
  InstallmentStatus,
  PartyType,
  ScheduleStatus,
  ScheduleType,
} from '@prisma/client';

// ── Module Tag ──────────────────────────────────────────────────────────────

export const InstallmentsApiTags = () =>
  ApiTags('📋 Installments — بيع بالتقسيط');

// ── Create Contract ─────────────────────────────────────────────────────────

export const CreateContractSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إنشاء عقد تقسيط جديد',
      description: `
        إنشاء عقد بيع بالتقسيط لطرف (عميل / مورد / موظف) مع توليد جدول الأقساط.

        **نوعا الجداول:**
        - \`FIXED\`: النظام يولّد الأقساط تلقائياً بمبالغ متساوية. يُستخدم \`startDate\` لحساب تواريخ الأقساط.
        - \`CUSTOM\`: المستخدم يحدد كل قسط بتاريخ ومبلغ مخصص عبر \`scheduleItems\`.

        **قواعد CUSTOM:**
        - \`scheduleItems.length\` يجب أن يساوي \`numberOfInstallments\`
        - مجموع \`scheduleItems[].amount\` يجب أن يساوي \`(totalAmount - downPayment)\` بفارق ±0.01

        **الآثار المالية:**
        - يُنشئ LedgerEntry (INVOICE) بمبلغ الدين \`(totalAmount - downPayment)\`
        - إذا وُجدت دفعة مقدمة: يُنشئ LedgerEntry (PAYMENT) ويُسجّل الدفعة
        - يُحدَّث رصيد الطرف آنياً (DB-level increment — لا حساب في JS)
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiBody({ type: CreateContractDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم إنشاء عقد التقسيط بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم إنشاء عقد التقسيط بنجاح',
          data: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            companyId: 'company-uuid',
            partyType: PartyType.CUSTOMER,
            partyId: 'party-uuid',
            contractNumber: 'CNT-2026-0001',
            description: 'عقد تقسيط — ثلاجة موديل XYZ',
            totalAmount: '10000.00',
            downPayment: '2000.00',
            paidAmount: '2000.00',
            numberOfInstallments: 8,
            scheduleType: ScheduleType.FIXED,
            startDate: '2026-03-01',
            status: InstallmentStatus.ACTIVE,
            schedules: [
              {
                id: 'schedule-uuid-1',
                installmentNumber: 1,
                dueDate: '2026-03-01',
                amount: '1000.00',
                paidAmount: '0.00',
                status: ScheduleStatus.PENDING,
              },
            ],
          },
          timestamp: '2026-02-22T10:30:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'الطرف غير موجود في الشركة',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description:
        'بيانات غير صالحة (مجموع الأقساط لا يتطابق / عدد الأقساط خاطئ / مبلغ الدين صفر)',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية إدارة عقود التقسيط',
    }),
  );

// ── Record Payment ──────────────────────────────────────────────────────────

export const RecordPaymentSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تسجيل دفعة على قسط',
      description: `
        تسجيل دفعة (كاملة أو جزئية) على قسط محدد ضمن عقد تقسيط.

        **قواعد الدفعة:**
        - \`amount\` يجب أن يكون أكبر من صفر
        - \`amount\` لا يتجاوز المتبقي من القسط \`(schedule.amount - schedule.paidAmount)\`
        - القسط يجب أن لا يكون PAID أو WAIVED

        **الآثار المالية (atomic $transaction):**
        - إنشاء LedgerEntry (PAYMENT) بمبلغ سالب
        - تحديث القسط: \`paidAmount += amount\`، تغيير status (PARTIAL → PAID)
        - تحديث العقد: \`paidAmount += amount\`، إذا اكتملت كل الأقساط → status = COMPLETED
        - Balance.decrement(amount) — DB-level
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({
      name: 'id',
      description: 'معرف العقد (UUID)',
      type: 'string',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiBody({ type: RecordInstallmentPaymentDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'تم تسجيل الدفعة بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم تسجيل الدفعة بنجاح',
          data: {
            id: 'payment-uuid',
            companyId: 'company-uuid',
            contractId: 'contract-uuid',
            scheduleId: 'schedule-uuid',
            ledgerEntryId: 'ledger-entry-uuid',
            amount: '500.00',
            paymentDate: '2026-03-15',
            paymentMethod: 'نقدي',
            notes: null,
            createdById: 'user-uuid',
            createdAt: '2026-03-15T10:00:00.000Z',
          },
          timestamp: '2026-03-15T10:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'العقد أو القسط غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'العقد غير نشط / القسط مسدَّد / المبلغ يتجاوز المتبقي',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية إدارة عقود التقسيط',
    }),
  );

// ── Cancel Contract ─────────────────────────────────────────────────────────

export const CancelContractSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'إلغاء عقد تقسيط (OWNER فقط)',
      description: `
        إلغاء عقد تقسيط نشط مع عكس الآثار المالية.

        **القيود:**
        - متاح للـ OWNER فقط
        - لا يمكن إلغاء عقود مكتملة (COMPLETED)
        - لا يمكن إلغاء عقود ملغاة مسبقاً (CANCELLED)

        **الآثار المالية (atomic $transaction):**
        - Soft-delete العقد (isDeleted=true, status=CANCELLED)
        - حساب المتبقي = \`totalAmount - paidAmount\`
        - إذا المتبقي > 0: Balance.decrement(remaining) — عكس الدين غير المسدَّد
        - تحويل جميع أقساط PENDING/PARTIAL إلى WAIVED
        - Soft-delete فاتورة الدفتر الأصلية (INVOICE LedgerEntry)
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({
      name: 'id',
      description: 'معرف العقد (UUID)',
      type: 'string',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تم إلغاء عقد التقسيط بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم إلغاء عقد التقسيط بنجاح',
          data: null,
          timestamp: '2026-02-22T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'العقد غير موجود',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'لا يمكن إلغاء عقد مكتمل أو ملغى مسبقاً',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'صلاحية OWNER مطلوبة لإلغاء العقود',
    }),
  );

// ── Get Contract ────────────────────────────────────────────────────────────

export const GetContractSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'جلب عقد تقسيط واحد',
      description: `
        جلب تفاصيل عقد تقسيط واحد مع جميع الأقساط واسم الطرف.

        **اختياري:** إرسال \`?includePayments=true\` لجلب الدفعات المسجّلة لكل قسط.
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiParam({
      name: 'id',
      description: 'معرف العقد (UUID)',
      type: 'string',
    }),
    ApiQuery({
      name: 'includePayments',
      description: 'جلب الدفعات المسجّلة لكل قسط',
      required: false,
      type: 'boolean',
      example: false,
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'تفاصيل عقد التقسيط',
      schema: {
        example: {
          success: true,
          message: 'تم جلب العقد بنجاح',
          data: {
            id: 'contract-uuid',
            contractNumber: 'CNT-2026-0001',
            partyType: PartyType.CUSTOMER,
            partyId: 'party-uuid',
            partyName: 'محمد أحمد',
            totalAmount: '10000.00',
            downPayment: '2000.00',
            paidAmount: '3000.00',
            status: InstallmentStatus.ACTIVE,
            schedules: [
              {
                id: 'schedule-uuid',
                installmentNumber: 1,
                dueDate: '2026-03-01T00:00:00.000Z',
                amount: '1000.00',
                paidAmount: '1000.00',
                status: ScheduleStatus.PAID,
                paidAt: '2026-03-01T10:00:00.000Z',
              },
            ],
          },
          timestamp: '2026-02-22T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'العقد غير موجود',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية عرض عقود التقسيط',
    }),
  );

// ── List Contracts ──────────────────────────────────────────────────────────

export const ListContractsSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'قائمة عقود التقسيط',
      description: `
        جلب قائمة مُجمَّعة من عقود التقسيط مع فلاتر متعددة وصفحات.

        **الفلاتر المتاحة:**
        - \`partyType\`: نوع الطرف (CUSTOMER / SUPPLIER / EMPLOYEE)
        - \`partyId\`: معرف طرف معين
        - \`status\`: حالة العقد (ACTIVE / COMPLETED / CANCELLED / DEFAULTED)
        - \`scheduleStatus\`: إظهار العقود التي لها أقساط بهذه الحالة (مثل OVERDUE)
        - \`dateFrom\` / \`dateTo\`: نطاق تاريخ الإنشاء
        - \`search\`: بحث في رقم العقد أو الوصف
        - \`page\`, \`limit\`, \`sortBy\`, \`sortOrder\`: pagination
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiQuery({
      name: 'partyType',
      enum: PartyType,
      required: false,
      description: 'فلترة حسب نوع الطرف',
    }),
    ApiQuery({
      name: 'partyId',
      required: false,
      description: 'UUID الطرف',
    }),
    ApiQuery({
      name: 'status',
      enum: InstallmentStatus,
      required: false,
      description: 'فلترة حسب حالة العقد',
    }),
    ApiQuery({
      name: 'scheduleStatus',
      enum: ScheduleStatus,
      required: false,
      description: 'فلترة العقود التي لها أقساط بهذه الحالة',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      description: 'تاريخ بداية الفترة (YYYY-MM-DD)',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      description: 'تاريخ نهاية الفترة (YYYY-MM-DD)',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      description: 'بحث في رقم العقد أو الوصف',
    }),
    ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة' }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'عدد السجلات في الصفحة',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'قائمة عقود التقسيط',
      schema: {
        example: {
          success: true,
          message: 'تم جلب العقود بنجاح',
          data: [
            {
              id: 'contract-uuid',
              contractNumber: 'CNT-2026-0001',
              partyType: PartyType.CUSTOMER,
              totalAmount: '10000.00',
              paidAmount: '3000.00',
              status: InstallmentStatus.ACTIVE,
            },
          ],
          meta: { total: 25, page: 1, limit: 10, totalPages: 3 },
          timestamp: '2026-02-22T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية عرض عقود التقسيط',
    }),
  );

// ── Get Schedule ────────────────────────────────────────────────────────────

export const GetScheduleSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'الأقساط المستحقة خلال فترة',
      description: `
        جلب قائمة الأقساط المستحقة خلال نطاق تاريخي محدد.

        **الاستخدام النموذجي:** "ما الأقساط المستحقة هذا الشهر؟"
        \`GET /installments/schedule?dateFrom=2026-03-01&dateTo=2026-03-31\`

        **ملاحظات:**
        - \`dateFrom\` و \`dateTo\` مطلوبان
        - \`status\` افتراضي: PENDING, PARTIAL, OVERDUE
        - يُعيد معلومات العقد مع كل قسط
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiQuery({
      name: 'dateFrom',
      required: true,
      description: 'تاريخ بداية الفترة (YYYY-MM-DD)',
      example: '2026-03-01',
    }),
    ApiQuery({
      name: 'dateTo',
      required: true,
      description: 'تاريخ نهاية الفترة (YYYY-MM-DD)',
      example: '2026-03-31',
    }),
    ApiQuery({
      name: 'status',
      enum: ScheduleStatus,
      required: false,
      isArray: true,
      description: 'فلترة حسب حالة القسط (يمكن تكرار المعامل)',
    }),
    ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة' }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'عدد السجلات في الصفحة',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'قائمة الأقساط المستحقة',
      schema: {
        example: {
          success: true,
          message: 'تم جلب جدول الأقساط بنجاح',
          data: [
            {
              id: 'schedule-uuid',
              installmentNumber: 3,
              dueDate: '2026-03-01T00:00:00.000Z',
              amount: '1000.00',
              paidAmount: '0.00',
              status: ScheduleStatus.PENDING,
              contract: {
                id: 'contract-uuid',
                contractNumber: 'CNT-2026-0001',
                partyType: PartyType.CUSTOMER,
                partyId: 'party-uuid',
                totalAmount: '10000.00',
                status: InstallmentStatus.ACTIVE,
              },
            },
          ],
          meta: { total: 15, page: 1, limit: 20, totalPages: 1 },
          timestamp: '2026-03-01T08:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'dateFrom بعد dateTo',
    }),
    ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'لا تملك صلاحية عرض الأقساط',
    }),
  );

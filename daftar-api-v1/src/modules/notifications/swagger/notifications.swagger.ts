// ============================================
// Notifications Swagger Decorators
// ============================================

import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

// ── Tag applied to entire controller ──
export const NotificationsApiTags = () =>
  ApiTags('🔔 Notifications — الإشعارات');

// ══════════════════════════════════════════════
// REGISTER DEVICE TOKEN
// ══════════════════════════════════════════════
export const RegisterDeviceTokenSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'تسجيل رمز الجهاز لاستقبال الإشعارات',
      description: `
يسجل رمز Expo Push Token للجهاز الحالي.

**يتم استدعاؤه عند:**
- بعد تسجيل الدخول مباشرةً
- عند منح المستخدم إذن الإشعارات في التطبيق

**ملاحظات:**
- نفس الرمز مع مستخدمين مختلفين → يُعاد ربطه بالمستخدم الحالي
- لا يتم إنشاء رموز مكررة (upsert)
      `,
    }),
    ApiResponse({
      status: 201,
      description: 'تم تسجيل الجهاز بنجاح',
      schema: {
        example: {
          success: true,
          data: { message: 'Device registered successfully' },
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      },
    }),
  );

// ══════════════════════════════════════════════
// UNREGISTER DEVICE TOKEN
// ══════════════════════════════════════════════
export const UnregisterDeviceTokenSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'إلغاء تسجيل رمز الجهاز',
      description: `
يُعطّل رمز Push Token لجهاز معين (عند تسجيل الخروج).

**يتم استدعاؤه عند:**
- تسجيل خروج المستخدم من جهاز معين
      `,
    }),
    ApiParam({
      name: 'token',
      description: 'رمز Expo Push Token المراد إلغاء تسجيله',
    }),
    ApiResponse({ status: 200, description: 'تم إلغاء التسجيل بنجاح' }),
  );

// ══════════════════════════════════════════════
// LIST NOTIFICATIONS
// ══════════════════════════════════════════════
export const ListNotificationsSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'قائمة الإشعارات (مع تصفح الصفحات)',
      description: `
جلب إشعارات المستخدم الحالي مرتبة من الأحدث للأقدم.

**خيارات التصفية:**
- \`onlyUnread=true\` — الإشعارات غير المقروءة فقط
      `,
    }),
    ApiQuery({ name: 'page', required: false, example: 1, type: Number }),
    ApiQuery({ name: 'limit', required: false, example: 20, type: Number }),
    ApiQuery({
      name: 'onlyUnread',
      required: false,
      example: false,
      type: Boolean,
    }),
    ApiResponse({
      status: 200,
      description: 'تم جلب الإشعارات بنجاح',
      schema: {
        example: {
          success: true,
          data: {
            data: [
              {
                id: 'uuid',
                type: 'ledger.created',
                title: 'قيد جديد',
                body: 'تم إضافة قيد جديد',
                data: { screen: 'LedgerDetail', entryId: 'uuid' },
                readAt: null,
                sentAt: '2025-01-01T10:00:00.000Z',
                createdAt: '2025-01-01T10:00:00.000Z',
              },
            ],
            meta: {
              total: 42,
              page: 1,
              limit: 20,
              totalPages: 3,
              hasNextPage: true,
              hasPreviousPage: false,
            },
          },
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      },
    }),
  );

// ══════════════════════════════════════════════
// GET UNREAD COUNT
// ══════════════════════════════════════════════
export const GetUnreadCountSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'عدد الإشعارات غير المقروءة (للبادج)',
      description: 'يُستخدم لعرض عداد الإشعارات على أيقونة الجرس في التطبيق.',
    }),
    ApiResponse({
      status: 200,
      description: 'تم جلب العدد بنجاح',
      schema: {
        example: {
          success: true,
          data: { count: 7 },
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      },
    }),
  );

// ══════════════════════════════════════════════
// MARK ONE READ
// ══════════════════════════════════════════════
export const MarkReadSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'تحديد إشعار كمقروء' }),
    ApiParam({ name: 'id', description: 'معرف الإشعار (UUID)' }),
    ApiResponse({ status: 200, description: 'تم تحديد الإشعار كمقروء' }),
    ApiResponse({ status: 404, description: 'الإشعار غير موجود' }),
  );

// ══════════════════════════════════════════════
// MARK ALL READ
// ══════════════════════════════════════════════
export const MarkAllReadSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'تحديد جميع الإشعارات كمقروءة',
      description: 'يُعيد عدد السجلات التي تم تحديثها.',
    }),
    ApiResponse({
      status: 200,
      description: 'تم تحديد جميع الإشعارات كمقروءة',
      schema: {
        example: {
          success: true,
          data: { count: 5 },
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      },
    }),
  );

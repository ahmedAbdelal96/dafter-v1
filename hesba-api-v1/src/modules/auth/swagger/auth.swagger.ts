// ============================================
// Auth Swagger Decorators
// ============================================
// Centralized Swagger documentation for the Auth module.
// Each API gets a dedicated decorator function that bundles
// all its Swagger metadata (summary, responses, body, etc.)
// This keeps the controller clean and focused on logic.
// ============================================

import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

// ── Tag applied to entire controller ──
export const AuthApiTags = () => ApiTags('🔐 Auth — التوثيق');

// ── POST /auth/register ──
export const RegisterSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تسجيل حساب جديد (شركة + Owner + فترة تجريبية)',
      description: `
ينشئ شركة جديدة مع مستخدم Owner ويبدأ فترة تجريبية مجانية.
لا يحتاج توثيق — Endpoint عام.

**ما يحصل:**
1. تسجيل الشركة والمستخدم في عملية واحدة (atomic)
2. إنشاء اشتراك تجريبي مجاني
3. إرجاع JWT tokens فوراً

**المدخلات:** بيانات المستخدم + بيانات الشركة
      `,
    }),
    ApiBody({ type: RegisterDto }),
    ApiResponse({
      status: 201,
      description:
        'تم التسجيل بنجاح — يرجع بيانات المستخدم + الشركة + التوكنات',
      schema: {
        example: {
          success: true,
          data: {
            user: {
              id: 'uuid',
              fullName: 'أحمد محمد',
              email: 'ahmed@example.com',
              role: 'OWNER',
            },
            company: { id: 'uuid', name: 'شركة النور' },
            subscription: {
              status: 'TRIAL',
              trialEndsAt: '2026-03-07T00:00:00.000Z',
            },
            tokens: { accessToken: 'eyJ...', refreshToken: 'a1b2c3...' },
          },
          message: 'تم تسجيل الحساب بنجاح',
          timestamp: '2026-02-21T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'البريد الإلكتروني مستخدم بالفعل',
    }),
    ApiResponse({
      status: 400,
      description: 'بيانات غير صالحة (Validation Error)',
    }),
  );

// ── POST /auth/login ──
export const LoginSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تسجيل الدخول',
      description: `
يتحقق من الإيميل وكلمة المرور ويرجع JWT tokens.

**الحماية:**
- قفل الحساب بعد 5 محاولات فاشلة (15 دقيقة)
- Rate limiting على الـ endpoint
- تأخير زمني ثابت لمنع user enumeration

**rememberMe:** يتحكم في مدة الـ refresh token
- \`true\` → 7 أيام
- \`false\` → 24 ساعة
      `,
    }),
    ApiBody({ type: LoginDto }),
    ApiResponse({
      status: 200,
      description: 'تم تسجيل الدخول بنجاح',
      schema: {
        example: {
          success: true,
          data: {
            user: {
              id: 'uuid',
              fullName: 'أحمد',
              email: 'ahmed@example.com',
              role: 'OWNER',
              companyId: 'uuid',
            },
            tokens: { accessToken: 'eyJ...', refreshToken: 'a1b2c3...' },
          },
          message: 'تم تسجيل الدخول بنجاح',
          timestamp: '2026-02-21T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'بيانات دخول غير صحيحة أو الحساب مقفل',
    }),
    ApiResponse({ status: 403, description: 'الحساب أو الشركة معطلة' }),
  );

// ── POST /auth/refresh ──
export const RefreshTokenSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تجديد التوكن (Refresh Token Rotation)',
      description: `
يستقبل الـ refresh token ويرجع زوج جديد (access + refresh).
الـ token القديم يُلغى فوراً.

**أمان:** إذا تم إعادة استخدام token ملغي، يتم إلغاء كل sessions المستخدم.
      `,
    }),
    ApiBody({ type: RefreshTokenDto }),
    ApiResponse({
      status: 200,
      description: 'تم تجديد التوكن بنجاح',
    }),
    ApiResponse({ status: 401, description: 'توكن غير صالح أو منتهي أو ملغي' }),
  );

// ── POST /auth/logout ──
export const LogoutSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تسجيل خروج (جهاز واحد)',
      description: 'يلغي الـ refresh token الخاص بالجهاز الحالي فقط.',
    }),
    ApiBearerAuth('access-token'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
    }),
    ApiResponse({ status: 200, description: 'تم تسجيل الخروج بنجاح' }),
    ApiResponse({ status: 401, description: 'غير مصرح' }),
  );

// ── POST /auth/logout-all ──
export const LogoutAllSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تسجيل خروج من كل الأجهزة',
      description:
        'يلغي كل الـ refresh tokens الخاصة بالمستخدم. مفيد لو اشتبه إن الحساب مخترق.',
    }),
    ApiBearerAuth('access-token'),
    ApiResponse({
      status: 200,
      description: 'تم تسجيل الخروج من كل الأجهزة',
      schema: {
        example: {
          success: true,
          data: { revokedCount: 3 },
          message: 'تم تسجيل الخروج من جميع الأجهزة',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'غير مصرح' }),
  );

// ── POST /auth/change-password ──
export const ChangePasswordSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تغيير كلمة المرور',
      description: `
يغير كلمة مرور المستخدم الحالي.
لازم يكتب كلمة المرور الحالية للتأكيد.
بعد التغيير يتم إلغاء كل الـ sessions (لازم يسجل دخول تاني).
      `,
    }),
    ApiBearerAuth('access-token'),
    ApiBody({ type: ChangePasswordDto }),
    ApiResponse({ status: 200, description: 'تم تغيير كلمة المرور بنجاح' }),
    ApiResponse({
      status: 400,
      description: 'كلمة المرور الحالية غير صحيحة أو الجديدة مطابقة',
    }),
    ApiResponse({ status: 401, description: 'غير مصرح' }),
  );

// ── GET /auth/me ──
export const GetProfileSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'بيانات المستخدم الحالي',
      description: 'يرجع بيانات المستخدم + الشركة + الصلاحيات.',
    }),
    ApiBearerAuth('access-token'),
    ApiResponse({
      status: 200,
      description: 'تم جلب بيانات الملف الشخصي',
      schema: {
        example: {
          success: true,
          data: {
            id: 'uuid',
            fullName: 'أحمد محمد',
            email: 'ahmed@example.com',
            phone: '01012345678',
            role: 'OWNER',
            status: 'ACTIVE',
            company: { id: 'uuid', name: 'شركة النور' },
            permissions: null,
            createdAt: '2026-02-21T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'غير مصرح' }),
  );

// ── POST /auth/forgot-password ──
export const ForgotPasswordSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'طلب إعادة تعيين كلمة المرور',
      description: `
        يرسل OTP مؤلف من 6 أرقام إلى:
        - **البريد الإلكتروني** (Gmail) إذا تم إدخال إيميل
        - **WhatsApp** إذا تم إدخال رقم هاتف دولي (+20...)

        **ملاحظة أمنية:** دائماً يرجع 200 حتى لو الحساب غير موجود
        (لحماية خصوصية المستخدمين — user enumeration prevention).

        الكود صالح **15 دقيقة** فقط.
      `,
    }),
    ApiBody({ type: ForgotPasswordDto }),
    ApiResponse({
      status: 200,
      description:
        'تم إرسال كود التحقق (أو تم تجاهل الطلب بصمت إذا لم يوجد الحساب)',
      schema: {
        example: {
          success: true,
          message: 'تم إرسال كود التحقق',
          data: { channel: 'email' },
          timestamp: '2026-02-22T10:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 429,
      description: 'تجاوزت الحد المسموح — حاول بعد دقيقة',
    }),
  );

// ── POST /auth/reset-password ──
export const ResetPasswordSwagger = () =>
  applyDecorators(
    ApiOperation({
      summary: 'تعيين كلمة مرور جديدة باستخدام OTP',
      description: `
        بعد استلام OTP عبر الإيميل أو WhatsApp، أرسل:
        - **identifier**: نفس الإيميل أو رقم الهاتف المستخدم في طلب الإعادة
        - **otp**: الكود المؤلف من 6 أرقام
        - **newPassword**: كلمة المرور الجديدة (8 أحرف على الأقل)

        **عند النجاح:**
        - تُحدَّث كلمة المرور فوراً
        - تُلغى **جميع الجلسات** النشطة (كل الأجهزة) لضمان الأمان
        - يجب تسجيل الدخول مرة أخرى
      `,
    }),
    ApiBody({ type: ResetPasswordDto }),
    ApiResponse({
      status: 200,
      description: 'تم تعيين كلمة المرور الجديدة بنجاح',
      schema: {
        example: {
          success: true,
          message: 'تم تعيين كلمة المرور الجديدة بنجاح',
          data: null,
          timestamp: '2026-02-22T10:05:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'الكود غير صالح أو منتهي الصلاحية',
    }),
    ApiResponse({ status: 429, description: 'تجاوزت الحد المسموح' }),
  );

// ── GET /auth/sessions ──
export const GetSessionsSwagger = () =>
  applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'عرض الأجهزة المتصلة (Sessions النشطة)',
      description: `
يرجع قائمة بجميع refresh tokens النشطة للمستخدم الحالي.

**ما يعني "نشط":**
- لم يُلغى (ليس في logout)
- لم تنتهِ صلاحيته بعد

**معلومات الجهاز المُعادة:** id, userAgent, ip, تاريخ الإنشاء, تاريخ الانتهاء.
tokenHash لا يـُعاد أبداً (أمان).
      `,
    }),
    ApiResponse({
      status: 200,
      description: 'تم جلب قائمة الجلسات النشطة',
      schema: {
        example: {
          success: true,
          data: [
            {
              id: 'uuid',
              userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
              ip: '197.33.x.x',
              createdAt: '2026-02-20T08:00:00.000Z',
              expiresAt: '2026-02-27T08:00:00.000Z',
            },
            {
              id: 'uuid-2',
              userAgent: 'Daftar-Mobile/1.0.0 (Android 14)',
              ip: '102.88.x.x',
              createdAt: '2026-02-22T10:00:00.000Z',
              expiresAt: '2026-02-23T10:00:00.000Z',
            },
          ],
          message: 'تم جلب قائمة الجلسات',
          timestamp: '2026-02-22T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'غير مصرح — JWT مطلوب' }),
  );

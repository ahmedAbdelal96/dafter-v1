# Hesba API v1

## الدور داخل المستودع
تطبيق الـ backend الخاص بمنصة Hesba، مسؤول عن واجهات API والمنطق الخلفي والتكاملات الأساسية.

## تقنيات مؤكدة من المشروع
- Runtime/Framework: `Node.js` + `NestJS`
- Language: `TypeScript`
- ORM/DB Layer: `Prisma` + PostgreSQL driver (`pg`)
- Queue/Background: `Bull` مع Redis
- API Docs: Swagger عبر المسار `api/docs`
- Testing: `jest` و `supertest` (حسب سكربتات المشروع)
- i18n: `nestjs-i18n`

## هيكل مهم داخل المشروع
- `src/modules`: الوحدات الوظيفية
- `src/common`: مكونات مشتركة (guards/interceptors/types...)
- `src/config`: إعدادات التطبيق
- `prisma`: schema وعمليات seed
- `test`: اختبارات
- `docs`: وثائق Backend قيد إعادة البناء

## مراجع محلية
- أوامر Prisma/تشغيل سريعة: `command.md`
- بذور البيانات: `prisma/seeds/README.md`
- وثائق backend الحالية: `docs/`

## ملاحظة حالة التوثيق
بعض وثائق backend داخل `docs/` تم تحويلها إلى نسخ Draft مؤقتة لأنها كانت تحتوي محتوى قديم/غير متسق، وسيتم استكمالها لاحقًا بشكل موثق.

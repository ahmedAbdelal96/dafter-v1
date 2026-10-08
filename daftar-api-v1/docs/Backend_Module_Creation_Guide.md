# Backend Module Creation Guide (Draft)

## الحالة
هذه الوثيقة قيد إعادة البناء لتصبح مرجعًا عمليًا مختصرًا لإنشاء Module جديد في Backend Hesba.

## النسخة المؤقتة (Minimal Rules)
1. اتبع بنية المشروع الحالية داخل `src/modules`.
2. لا تضف business logic في الـ controller.
3. حافظ على العزل متعدد الشركات (tenant scope) في كل استعلامات البيانات.
4. اربط التحقق (DTO/validation) مع المسارات بوضوح.
5. أضف/حدّث الاختبارات المناسبة قبل الدمج.

## سيتم إضافته لاحقًا
- قالب ملفات module موحّد
- checklist جودة قبل merge
- أمثلة موثقة من modules قائمة

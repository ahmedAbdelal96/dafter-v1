# API Contract Baseline (Hesba Dashboard)

## الهدف
تقليل الانحراف بين واجهة الويب والـ backend عبر مرجع عقد API مبسط.

## مصدر الحقيقة
- Backend controllers داخل `hesba-api-v1/src/modules`
- Swagger في backend عبر `api/docs`

## حدود هذه النسخة
هذه النسخة لا تسرد جميع endpoints تفصيليًا لتجنب معلومات قديمة/غير دقيقة.

## قواعد العمل
1. أي تعديل backend endpoint أو response shape يجب أن ينعكس في:
   - `src/lib/api/config.ts`
   - `src/lib/api/services/*`
   - `src/lib/api/hooks/*`
   - الأنواع المرتبطة (types)
2. عند أي شك، اعتمد backend code + Swagger فقط.
3. لا تعتمد على ملفات planning legacy كمصدر contract.

## To Be Completed Later
- فهرس endpoints رسمي لكل module
- ملاحظات versioning/deprecation
- قائمة smoke checks مرتبطة بالعقد

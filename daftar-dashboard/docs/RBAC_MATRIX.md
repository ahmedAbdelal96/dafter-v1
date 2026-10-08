# RBAC Matrix (Frontend Draft)

## الحالة
هذه الوثيقة نسخة مختصرة قيد إعادة البناء، وتعتمد على ما هو ظاهر حاليًا في:
- `src/config/route-access.ts`
- `src/lib/auth/permission-evaluator.ts`

## الأدوار المؤكدة حاليًا
- `SUPER_ADMIN`
- `OWNER`
- `STAFF`

## مبدأ مهم
التحكم النهائي في الصلاحيات يكون في الـ backend. أي matrix داخل الواجهة مجرد طبقة توجيه/إظهار UI.

## توثيق مؤجل
- مصفوفة تفصيلية role × permission لكل module
- سياسة الفروقات بين super-admin وtenant routes
- قواعد fallback عند غياب staff permissions

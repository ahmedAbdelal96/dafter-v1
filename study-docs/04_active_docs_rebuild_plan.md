# خطة إعادة بناء التوثيق النشط

التاريخ: 2026-04-01
الاسم الرسمي المعتمد: **Hesba**

## 1) الملفات النشطة التي سيتم تحديثها

### Root
- `README.md`

### App READMEs
- `hesba-api-v1/README.md`
- `hesba-dashboard/README.md`
- `hesba-dashboard-mobile/README.md`

### Backend docs (نشطة وتحتاج تنظيف)
- `hesba-api-v1/docs/PLAN.md`
- `hesba-api-v1/docs/PLAN2.md`
- `hesba-api-v1/docs/Backend_Module_Creation_Guide.md`

### Dashboard docs folder
- `hesba-dashboard/docs/API_CONTRACT_BASELINE.md`
- `hesba-dashboard/docs/MODULE_DELIVERY_CHECKLIST.md`
- `hesba-dashboard/docs/RBAC_MATRIX.md`
- `hesba-dashboard/docs/DATA_TABLE_GUIDE.md`

### Root docs (واضح أنها ما زالت نشطة لكنها تحتاج إعادة صياغة آمنة)
- `docs/WEB_MOBILE_PARITY_AUDIT.md`
- `docs/NEXT_2_SPRINTS_WEB_MOBILE.md`
- `docs/HASBA_CASH_RECONCILIATION_PHASE1_GUIDE.md`
- `docs/HASBA_CASH_RECONCILIATION_PHASE2A_VISIBILITY_GUIDE.md`

## 2) الملفات النشطة التي ستبقى بدون تعديل في هذه الجولة

- `docs/company_lifecycle_checklist.md` (محتوى إجرائي واضح، ولا يعتمد على تسمية منتج قديمة)
- `docs/ux_prompt.md` (ملف prompt تصميمي وليس baseline تقني تشغيلي)
- `hesba-api-v1/command.md` (مرجع أوامر محلي)
- `hesba-api-v1/prisma/seeds/README.md` (مرجع seed متخصص)
- `load-tests/README.md` (خارج نطاق core docs الحالي)
- `developer_prompt_pack.md` (مرجع مساعد)
- ملفات `study-docs` السابقة (مراجع إدخال لهذه المهمة)
- ملفات التخطيط الكبيرة خارج مجلدات docs الأساسية:
  - `hesba-dashboard/FRONTEND_MODULES_PRIORITY.md`
  - `hesba-dashboard/FRONTEND_MODULE_CREATION_PROMPT.md`
  - `hesba-dashboard/SUPERADMIN_MODULES_PRIORITY.md`
  - `hesba-dashboard/SUPERADMIN_SUBSCRIPTION_ENTITLEMENTS_MASTER_PLAN.md`
  - `hesba-dashboard/SUPERADMIN_SPRINT*.md`
  - `hesba-dashboard-mobile/MOBILE_IMPLEMENTATION_PLAN.md`
  - `hesba-dashboard-mobile/MOBILE_MODULE_CREATION_PROMPT.md`
  - `hesba-dashboard-mobile/MOBILE_PARITY_MATRIX.md`
  - `hesba-dashboard-mobile/commands.md`

## 3) ملفات تفتقد معلومات موثقة كفاية (سيتم تحويلها إلى Draft/Placeholder)

- `hesba-api-v1/docs/PLAN.md`
- `hesba-api-v1/docs/PLAN2.md`
- `hesba-api-v1/docs/Backend_Module_Creation_Guide.md`
- `docs/WEB_MOBILE_PARITY_AUDIT.md`
- `docs/NEXT_2_SPRINTS_WEB_MOBILE.md`
- `docs/HASBA_CASH_RECONCILIATION_PHASE1_GUIDE.md`
- `docs/HASBA_CASH_RECONCILIATION_PHASE2A_VISIBILITY_GUIDE.md`

السبب: محتوى قديم/مختلط تسمية/به مشاكل ترميز أو ادعاءات تشغيلية واسعة غير مؤكدة بالكامل من فحص هذه الجولة.

## 4) الهيكل المقترح لمجموعة التوثيق النشط بعد إعادة البناء

1. مدخل رئيسي بسيط في `README.md`.
2. README واضح لكل تطبيق:
   - API
   - Web Dashboard
   - Mobile Dashboard
3. Docs تشغيلية قصيرة داخل كل تطبيق:
   - backend docs كـ drafts موجهة مؤقتًا
   - dashboard docs مختصرة وعملية (contract/checklist/rbac/datatable)
4. `docs/` الجذر يحتوي وثائق موضوعية لكن مع وسم "قيد إعادة البناء" عند نقص التحقق.
5. `study-docs/` يظل المرجع الإداري للعملية (audit/index/backlog/changelogs).

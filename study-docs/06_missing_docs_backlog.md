# Missing Docs Backlog

Date: 2026-04-01

## 1) System Architecture Overview
- Status: completed in this pass
- Purpose: توثيق صورة المنصة كاملة (API + Web + Mobile) والعلاقات بينها.
- Priority: high
- Suggested location: `docs/system_architecture_overview.md`
- Dependencies/Blockers: none for baseline; deeper deployment detail still needs verification.

## 2) Backend Module Map
- Status: completed in this pass
- Purpose: مرجع رسمي لكل modules في `hesba-api-v1/src/modules` وحدود كل module.
- Priority: high
- Suggested location: `docs/backend_module_map.md`
- Dependencies/Blockers: detailed ownership + per-module deep docs still pending.

## 3) Web Feature Map
- Status: pending
- Purpose: توثيق feature boundaries في `hesba-dashboard/src/features` ومسارات `src/app`.
- Priority: high
- Suggested location: `hesba-dashboard/docs/feature_map.md`
- Dependencies/Blockers: مطابقة نهائية للمسارات الفعلية مع التكاملات backend.

## 4) Mobile App Structure
- Status: pending
- Purpose: توثيق هيكل تطبيق الموبايل (`src/app`, `src/features`, `src/lib`).
- Priority: high
- Suggested location: `hesba-dashboard-mobile/docs/app_structure.md`
- Dependencies/Blockers: إنشاء مجلد `docs` للموبايل أو اعتماد مسار بديل داخل المشروع.

## 5) Local Development Setup
- Status: pending
- Purpose: خطوات تشغيل محلية موحدة للمستودع (بدون أسرار).
- Priority: high
- Suggested location: `docs/local_development_setup.md`
- Dependencies/Blockers: توحيد المنافذ المطلوبة واعتماد المتطلبات بين التطبيقات.

## 6) Environment Variables Reference
- Status: pending
- Purpose: مرجع آمن لمتغيرات البيئة المطلوبة (الأسماء فقط + الغرض).
- Priority: high
- Suggested location: `docs/environment_variables_reference.md`
- Dependencies/Blockers: استخراج المتغيرات من config files عبر التطبيقات ومراجعتها.

## 7) Deployment Overview
- Status: pending
- Purpose: وصف بيئات النشر والتبعيات الأساسية وخطوات عالية المستوى.
- Priority: medium
- Suggested location: `docs/deployment_overview.md`
- Dependencies/Blockers: توثيق CI/CD الحالي واعتماد مسارات النشر الفعلية.

## 8) Testing Strategy
- Status: pending
- Purpose: توحيد استراتيجية الاختبار (unit/integration/e2e/smoke) عبر backend/web/mobile.
- Priority: high
- Suggested location: `docs/testing_strategy.md`
- Dependencies/Blockers: جرد كامل لاختبارات موجودة فعليًا وسيناريوهات ناقصة.

## 9) API Integration Guide
- Status: completed in this pass
- Purpose: مرجع تكامل backend-web-mobile (contracts, invalidation, error mapping).
- Priority: high
- Suggested location: `docs/api_integration_guide.md`
- Dependencies/Blockers: module-level endpoint matrix still pending.

## 10) Auth/Session Flow
- Status: completed in this pass (baseline, verification-grounded)
- Purpose: توثيق دورة المصادقة والجلسات عبر التطبيقات الثلاثة.
- Priority: high
- Suggested location: `docs/auth_session_flow.md`
- Dependencies/Blockers: حسم نموذج web النهائي وتوحيد مصادر role/session لا يزال مطلوبًا.

## 11) Observability & Logging
- Status: completed in this pass (baseline, verification-grounded)
- Purpose: توثيق logging/monitoring/error tracking ومتى نستخدم كل قناة.
- Priority: medium
- Suggested location: `docs/observability_logging.md`
- Dependencies/Blockers: تفعيل/تأكيد wiring النهائي لـ Sentry في runtime ما زال مطلوبًا.

## 13) API Response Contract Standardization
- Status: pending
- Purpose: توحيد شكل استجابات النجاح/الخطأ وإزالة التباينات بين modules والعملاء.
- Priority: high
- Suggested location: `docs/api_response_contract_standard.md`
- Dependencies/Blockers: قرار هندسي موحد للـ envelope وربط global error filter/interceptor.

## 12) Contribution Guide
- Status: pending
- Purpose: توحيد قواعد العمل (branching, PR checklist, commit style, review gates).
- Priority: medium
- Suggested location: `CONTRIBUTING.md`
- Dependencies/Blockers: اتفاق الفريق على policy موحد.

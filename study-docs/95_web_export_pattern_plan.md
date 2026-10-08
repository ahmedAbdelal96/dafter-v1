# Web Export Pattern Plan

## 1) Exact Files Proposed For Change
1. `hesba-dashboard/src/lib/export/export-shaping.ts` (new)
2. `hesba-dashboard/src/features/customers/utils/customer-export.ts`
3. `hesba-dashboard/src/features/suppliers/utils/supplier-export.ts`
4. `study-docs/94_web_export_pattern_audit.md` (created)
5. `study-docs/96_web_export_pattern_verification.md` (to create)
6. `study-docs/97_web_export_pattern_change_log.md` (to create)

## 2) Exact Improvement To Apply
- Introduce tiny shared export-shaping type primitives:
  - `ExportTranslator`
  - `ExportRow`
- Replace duplicated feature-local type aliases with imports from shared file.

## 3) Why It Is Safe
- Type-level alignment only.
- No runtime behavior changes in row mapping logic.
- No page flow, query logic, or API contract changes.

## 4) Intended Behavioral Impact
- Intended impact: **none**.

## 5) Risk Assessment
- Very low risk (typing/convention alignment only).

## 6) Rollback Notes
- Revert three files to previous state.
- No data or runtime migration required.

## 7) Verification Plan
1. Run `npm run build` in `hesba-dashboard`.
2. Ensure type-check passes and route build output remains healthy.

# 62 - Login UseCase Cleanup Plan

Date: 2026-04-01
Scope: one narrow structural cleanup pass for LoginUseCase

## 1) Exact files proposed for change
- `hesba-api-v1/src/modules/auth/use-cases/login.use-case.ts`
- `study-docs/63_login_usecase_cleanup_verification.md` (new)
- `study-docs/64_login_usecase_cleanup_change_log.md` (new)

## 2) Exact cleanup actions
1. Introduce small local types for readability (`RequestMeta`, inferred `LoginUser`).
2. Extract helper methods for flow clarity:
- email normalization
- credential resolution
- invalid-credential handling
- user/company eligibility assertion
- JWT payload builder
- login response builder
- token issuance wrapper
3. Keep lockout increment/reset behavior and branch ordering unchanged.

## 3) Intended behavioral impact
- No intended behavior change.
- External login contract (input/output/errors) remains the same.

## 4) Risk assessment
- Low risk: single file internal refactor.
- Main risk: accidental ordering drift; mitigated by existing login/refresh tests + build.

## 5) Rollback notes
- Revert `login.use-case.ts` to previous version.
- No schema/config/dependency rollback needed.

## 6) Verification plan
- Run targeted auth unit tests (`login` + `refresh`).
- Run backend build.
- Confirm no endpoint/DTO contract changes.

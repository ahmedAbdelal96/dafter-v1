# 55 - Auth Session Cleanup Plan

Date: 2026-04-01
Scope: one narrow structural cleanup in backend auth/session flow

## 1) Exact files proposed for change
- `hesba-api-v1/src/modules/auth/use-cases/refresh-token.use-case.ts`
- `hesba-api-v1/src/modules/auth/use-cases/refresh-token.use-case.spec.ts` (new)
- `study-docs/56_auth_session_cleanup_verification.md` (new)
- `study-docs/57_auth_session_cleanup_change_log.md` (new)

## 2) Exact cleanup actions
1. Refactor `RefreshTokenUseCase.execute(...)` into clearer typed internal steps:
- token lookup + invalid-token handling
- token usability checks (revoked/expired)
- user/company eligibility checks
- JWT payload building for token reissue

2. Add local inferred types in use-case for readability and safer payload shaping.

3. Add mock-only unit tests for key refresh branches:
- token not found
- revoked token reuse
- success rotation path
- disabled-user rejection path

## 3) Intended behavioral impact
- Intended impact: none (internal structure/readability only).
- External auth/session contract and token semantics remain unchanged.

## 4) Risk assessment
- Low risk: single use-case internal refactor + isolated unit tests.
- Main risk: branch ordering drift; mitigated by focused tests and build verification.

## 5) Rollback notes
- Revert `refresh-token.use-case.ts` and remove added spec file.
- No config/schema/dependency rollback required.

## 6) Verification plan
- Run targeted refresh-token unit test.
- Run backend build/typecheck (`npm run build`).
- Confirm no endpoint signature or DTO contract changes.

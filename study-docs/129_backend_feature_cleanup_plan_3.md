# 129 Backend Feature Cleanup Plan (Pass 3)

## 1) Exact files proposed for change
- `hesba-api-v1/src/modules/users/users.controller.ts`
- `study-docs/128_backend_feature_structural_audit_3.md` (created)
- `study-docs/129_backend_feature_cleanup_plan_3.md` (this file)
- `study-docs/130_backend_feature_cleanup_verification_3.md` (to be created)
- `study-docs/131_backend_feature_cleanup_change_log_3.md` (to be created)

## 2) Exact cleanup actions
- Add one private helper in `UsersController` to build paginated response envelopes.
- Refactor `listUsers` to use this helper instead of inline `(response as any).meta` mutation.

## 3) Intended behavioral impact
- None intended.
- Keep same list response shape and same translation message.

## 4) Risk assessment
- Low risk:
  - single-file local refactor.
  - no changes to use-case/repository/DTO signatures.
- Primary risk: accidental mismatch in data/meta wiring.

## 5) Rollback notes
- Rollback is straightforward by restoring previous inline response construction in `listUsers`.

## 6) Verification plan
1. Run `npm run build` in `hesba-api-v1`.
2. Run targeted users tests (`create-staff`, `disable-user`, `enable-user`) as regression safety.
3. Confirm `listUsers` still returns same items + meta envelope behavior.

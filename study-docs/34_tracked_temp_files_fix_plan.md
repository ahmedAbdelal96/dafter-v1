# 34 - Tracked Temp Files Fix Plan

Date: 2026-04-01
Repository: Hesba

## 1) Exact action for each file
- `hesba-api-v1/tmp-invoice-create-diag.ts`
  - Action: move to `hesba-api-v1/scripts/diagnostics/invoice-create-via-service.diag.ts`.
  - Also adjust relative imports after move.
- `hesba-api-v1/tmp-invoice-create-direct.ts`
  - Action: move to `hesba-api-v1/scripts/diagnostics/invoice-create-via-usecase.diag.ts`.
  - Also adjust relative imports after move.
- `hesba-api-v1/tmpclaude-172b-cwd`
  - Action: delete as local artifact.

## 2) New folder creation
- Create `hesba-api-v1/scripts/diagnostics/`.
- Add minimal `README.md` in that folder to clarify diagnostics-only purpose.

## 3) Ignore rules updates
- No new ignore rule required for this pass.
- Existing root/app hygiene rules already cover temporary log patterns.

## 4) Why actions are safe
- Moving scripts preserves diagnostic value while removing root-level temp noise.
- Deleting `tmpclaude-172b-cwd` removes non-source local metadata only.
- No business logic/runtime module wiring is changed.

## 5) Rollback notes
- If needed, move scripts back to original paths.
- Deleted local artifact can be recreated manually if ever required.

## 6) Verification plan
- Confirm old paths are gone and new paths exist.
- Confirm updated imports are valid relative to new locations.
- Confirm `git status` shows intended moves/deletion and no unrelated backend runtime changes from this pass.

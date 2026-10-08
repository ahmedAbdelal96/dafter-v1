# 125 Suppliers Controller Cleanup Plan

## 1) Exact files proposed for change
- `hesba-api-v1/src/modules/suppliers/suppliers.controller.ts`
- `study-docs/124_suppliers_controller_audit.md` (created)
- `study-docs/125_suppliers_controller_cleanup_plan.md` (this file)
- `study-docs/126_suppliers_controller_cleanup_verification.md` (to be created)
- `study-docs/127_suppliers_controller_cleanup_change_log.md` (to be created)

## 2) Exact cleanup actions
- Add one private helper in controller for paginated response shaping.
- Refactor `findAll` to call helper instead of mutating response with inline `(response as any)`.

## 3) Intended behavioral impact
- None intended.
- Response payload shape and message remain the same.

## 4) Risk assessment
- Low risk:
  - single-file structural cleanup.
  - no endpoint signature or service call changes.
- Main risk: accidental message/meta wiring mismatch during extraction.

## 5) Rollback notes
- Revert `suppliers.controller.ts` to prior inline response construction.

## 6) Verification plan
1. Run `npm run build` in `hesba-api-v1`.
2. Run targeted suppliers list use-case tests as stability guard.
3. Confirm `findAll` still returns list data + meta envelope behavior.

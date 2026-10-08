# Mobile Auth Store Flow Test Verification (Pass 2)

## 1) Commands / Checks Run
1. `npm run test:unit -- src/stores/auth-store.spec.ts`
2. `npm run lint`

## 2) Which Tests Passed
- Test suite: `src/stores/auth-store.spec.ts`
- Result: **9 passed / 9 total**

Newly covered initialize/login branches:
1. initialize success with valid token/user/tenant hydration.
2. initialize no-token branch.
3. login success with tenant hydration from `/companies/me`.
4. login success fallback when company fetch fails.
5. login failure path with error mapping and no authenticated residue.

## 3) Anything That Failed
- Initial run exposed a real behavior gap in no-token initialize branch (stale auth residue if in-memory state was previously authenticated).
- Applied a tiny production fix in `auth-store.ts` to clear stale state before returning on no-token branch.
- Re-ran tests: all passed.

## 4) Setup Limitations
- Mock-only unit tests.
- No emulator/device/E2E coverage in this pass.
- Lint still has pre-existing warnings outside this scope.

## 5) Remaining Untested Branches
1. initialize path when `authApi.getMe` succeeds but company fetch fails (tenant-null authenticated case).
2. login failure fallback to default Arabic message when backend message is missing.
3. session-expired callback execution path end-to-end (beyond registration behavior).
4. non-auth helper selectors/hook memo outputs (`useAuth`) remain untested.

## 6) Confidence Level
- **High** for initialize/login store behavior covered in this pass.
- **Medium-High** for total auth-store confidence (some branches intentionally deferred).

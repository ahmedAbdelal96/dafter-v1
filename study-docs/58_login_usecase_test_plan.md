# LoginUseCase Test Plan (Narrow Security/Control-Flow Pass)

## 1) What `LoginUseCase` currently does
- Normalizes email (`toLowerCase().trim()`).
- Checks Redis-backed lockout key `login_attempts:{email}` before any repository or password work.
- Loads user via `authRepo.findUserByEmail`.
- Verifies password via `bcrypt.compare`.
- Rejects disabled/deleted users.
- Rejects inactive/deleted companies when user has a company.
- Issues tokens via `tokenService.generateAndStoreTokens` only on valid success path.
- Clears failed attempts (`cache.del`) only on valid success path.
- Increments failed attempts (`cache.set` with TTL=900s) on invalid credentials paths.

## 2) Highest-priority security/control-flow branches to test
- Success path with company-less user (e.g., super-admin-like path) still issues tokens.
- Disabled/deleted user branch blocks login and does not issue tokens.
- Inactive/deleted company branch blocks login and does not issue tokens.
- Invalid credentials branches increment lockout counter and do not issue tokens.
- Lockout threshold behavior: failed attempts count progression toward lockout window remains deterministic.
- Side-effect isolation:
  - no token issuance on any failure branch
  - no failed-attempt increment on non-credential failures (disabled/deleted user/company).

## 3) Proposed mock/stub strategy
- Keep all tests mock-only:
  - `AuthRepository` mocked (`findUserByEmail` only).
  - `TokenService` mocked (`generateAndStoreTokens` only).
  - `CacheService` mocked (`get/set/del`).
  - `TranslationService` mocked deterministic (`translate(key) => key`).
  - `bcrypt.compare` mocked via `jest.mock('bcrypt')`.
- No DB, no integration setup.

## 4) Proposed test cases (this pass)
1. **Company-null success path**
   - Active user with `company: null` logs in successfully.
   - Tokens issued once and failed-attempt key cleared.
2. **Deleted user rejection**
   - `isDeleted=true` user is rejected with `ForbiddenException`.
   - No token issuance and no failed-attempt clear.
3. **Deleted company rejection**
   - Active user in `company.isDeleted=true` is rejected with `ForbiddenException`.
   - No token issuance and no failed-attempt clear.
4. **Invalid password reaching lockout threshold**
   - Existing attempts=4, invalid password increments to 5 with expected TTL.
   - No token issuance and no failed-attempt clear.
5. **Disabled/deleted branches do not mutate failed-attempt counter**
   - Ensure `cache.set` is not called in disabled/deleted-user/company branches.

## 5) Exact files likely to be created/changed
- `D:\Web\full-projects\hesba\hesba-api-v1\src\modules\auth\use-cases\login.use-case.spec.ts` (update)
- `D:\Web\full-projects\hesba\study-docs\58_login_usecase_test_plan.md` (new)
- `D:\Web\full-projects\hesba\study-docs\59_login_usecase_test_verification.md` (new, after execution)
- `D:\Web\full-projects\hesba\study-docs\60_login_usecase_test_change_log.md` (new, after execution)

## 6) Risks / non-goals
- Non-goal: refactoring auth flow or changing login runtime behavior.
- Non-goal: DB/integration coverage.
- Risk: overfitting tests to internal sequence details; mitigation is to assert outcome-critical side effects only.
- Known structural gap (out of scope): lockout and session policies are still split across use cases/services with minimal shared policy abstraction.

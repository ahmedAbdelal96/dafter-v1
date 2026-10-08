# LoginUseCase Test Change Log

## Files created / updated

### Created
- `D:\Web\full-projects\hesba\study-docs\58_login_usecase_test_plan.md`
- `D:\Web\full-projects\hesba\study-docs\59_login_usecase_test_verification.md`
- `D:\Web\full-projects\hesba\study-docs\60_login_usecase_test_change_log.md`

### Updated
- `D:\Web\full-projects\hesba\hesba-api-v1\src\modules\auth\use-cases\login.use-case.spec.ts`

### Production files changed
- None.

## Login behaviors now explicitly protected by tests
- Success login with normalized email issues tokens and clears lockout attempts.
- Lockout pre-check short-circuits before repository/password/token work.
- User-not-found path increments failed attempts with lockout TTL and blocks token issuance.
- Password-mismatch path increments failed attempts with lockout TTL and blocks token issuance.
- Lockout threshold progression to `5` failed attempts is explicitly asserted.
- Disabled user blocks login without token issuance and without clearing attempts.
- Deleted user blocks login without token issuance and without clearing attempts.
- Inactive company blocks login without token issuance and without clearing attempts.
- Deleted company blocks login without token issuance and without clearing attempts.
- Company-null active user path remains valid and still issues tokens.

## Remaining untested / weak areas
- Cache error-handling behavior (`cache.get/set/del` exceptions).
- `bcrypt.compare` exception behavior.
- Time-based lockout expiry behavior.
- Integration-level guarantees (repository + token persistence in real infrastructure).

## Recommended follow-up
1. Add a very small integration test pass (auth use-cases with test DB/redis doubles) focused on lockout persistence and token/session persistence.
2. Add negative-path resilience tests for dependency failures (cache/bcrypt/translation) if operational policy requires graceful degradation.

---

## Auth Integration / Resilience Mini Pass (Implemented)

### Additional file created
- `D:\Web\full-projects\hesba\hesba-api-v1\src\modules\auth\use-cases\auth-resilience-mini-pass.spec.ts`

### Scope implemented in this mini pass
- Stateful lockout persistence tests across repeated login attempts.
- Deterministic lockout expiry tests using a controlled clock + TTL-aware cache double.
- Dependency failure tests:
  - cache get failure
  - cache set failure
  - bcrypt compare exception
- Refresh-token/session side-effect integration tests with a stateful in-memory token store:
  - valid rotation/revocation
  - revoked token reuse => revoke all sessions
  - missing token hash rejection

### Production code impact
- No production files changed.
- No auth contract changes.

### Behaviors now protected (incremental)
- Lockout persists across requests for normalized email key and short-circuits correctly.
- Lockout expiry is deterministic and unlock behavior is proven after TTL.
- No token issuance on critical dependency failure paths tested in this pass.
- Refresh token flow side effects are validated with stateful persistence expectations.

### Remaining gaps after mini pass
- No DB/Redis infra-backed integration tests yet.
- `cache.del` failure path not covered.
- Translation failure path not covered.
- Full e2e auth journey intentionally deferred.

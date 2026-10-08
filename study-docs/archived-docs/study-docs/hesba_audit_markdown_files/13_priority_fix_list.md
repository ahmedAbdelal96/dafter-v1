# Priority Fix List

## Top 10 critical problems
1. CI workflow path/branch mismatch likely means weak or broken protection
2. Docker/build path naming mismatch (`dafter-*` vs `hesba-*`)
3. Stale/misleading architecture docs and README
4. Logs committed to repo
5. Zip/binary artifacts committed to repo
6. Temporary/generated files committed to repo
7. Very small visible automated test coverage relative to domain scope
8. Product naming drift across code/config/docs
9. Encoding/mojibake issues in source text
10. Incomplete/shared contract governance across backend/web/mobile

## Top 10 quick wins
1. Remove logs, zip, tmp, tsbuildinfo, duplicate CSS files from VCS
2. Fix `.gitignore`
3. Repair CI trigger branches
4. Repair CI working directories/cache paths
5. Repair Docker build contexts
6. Replace stale README with current project overview
7. Replace stale architecture doc with current architecture
8. Add repo cleanliness check in CI
9. Add UTF-8 / encoding check
10. Add top-level `CONTRIBUTING.md` and `ARCHITECTURE_CURRENT.md`

## Top 10 refactor targets
1. `src/proxy.ts` (web route/auth coordination)
2. large mobile platform dashboard screens
3. Prisma schema documentation/ownership
4. shared auth/session model across apps
5. shared role constants/contracts
6. feature folder standardization in web/mobile
7. API client abstraction strategy
8. root monorepo structure/governance
9. backend transaction/invariant testing harness
10. docs structure and ownership

## Suggested implementation order
### Week 1
- repo cleanup
- CI repair
- Docker/path repair
- doc reset
- encoding audit

### Weeks 2–3
- backend critical integration tests
- role/auth/tenant contract tests
- frontend route/auth tests
- define shared contracts

### Weeks 4–6
- feature-module standardization
- large-screen refactors
- observability/performance instrumentation
- load-test operationalization

## Execution note
Do not start with visual polish. Start with repo truthfulness, build reliability, and financial correctness protection.

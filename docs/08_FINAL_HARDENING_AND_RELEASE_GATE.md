# B08 Final Hardening and Release Gate

## Baseline

- Branch: `codex/b08-final-hardening`
- B08 previous SHA: `62ef21438fce10bb1503456af3709642adbecddb`
- Required master base: `f962cb6dd45c49d0a8cd90f30451980ba034e8f1`
- Safety branch `backup/local-before-b07-sync` remains unchanged.
- Origin uses SSH: `git@github.com:ahmedAbdelal96/dafter-v1.git`.

## Hardening completed

- Fiscal-year and accounting-period status mutations require
  `manageFinanceClosure`; report reads use `viewFinancialReports`, with the
  existing `viewReports` compatibility path.
- Staff create/update permission DTOs persist both finance permissions.
- Prisma test pools use zero idle connections and a short idle timeout.
- Backend lint covers the complete source/test tree. The only scoped test
  overrides are for Jest mock-factory and detached mock-method patterns.
- Dashboard Next.js and `eslint-config-next` are on `16.4.0`.
- The unused `swiper` dependency and optional `xlsx` feature were removed.
  Existing Excel-export compatibility functions now download CSV.
- `nodemailer` is upgraded to `10.1.0`.

## Validation evidence

- Backend ESLint: 0 errors (`npm run lint -- --quiet`).
- Backend tests: 47 suites and 226 tests passed with
  `--detectOpenHandles --forceExit`.
- Prisma validate/generate, TypeScript build, and backend production build
  passed.
- Dashboard typecheck, ESLint, i18n/contract/role checks, F01 runtime tests,
  and production build passed; build generated 91/91 pages.
- Financial coverage includes tenant isolation, Decimal-safe aggregation,
  reversal netting, balanced currency lines, posted-entry immutability, and
  OPEN/SOFT_CLOSED/CLOSED closure behavior.
- Detect-open-handles produced only test-module Prisma pool teardown handles;
  pool connections are removed and no production lifecycle leak was found.
  CI retains `--forceExit` as a documented test-only mitigation.

## Dependency review

- Dashboard production audit: 0 high/critical vulnerabilities.
- Backend audit: 7 high and 5 moderate findings remain in the public npm
  report. The high Prisma findings are in the Prisma CLI dev dependency;
  `nestjs-i18n` reaches `chokidar` only for its disabled-by-default translation
  file-watch mode; the remaining moderate findings are transitive tooling or
  Bull's unpatched UUID path. No `npm audit fix --force` was used.
- These findings are recorded for dependency follow-up; they are not part of
  the deployed request path under the production configuration.

## Release decision

All B08 application and CI gates are green locally. The branch may be
fast-forwarded to `master`, pushed, and tagged `v0.1.0-rc1` after the final
working-tree review. Deployment is intentionally out of scope.

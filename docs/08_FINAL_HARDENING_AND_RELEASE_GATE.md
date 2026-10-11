# B08 Final Hardening and Release Gate

## Baseline

- Branch: `codex/b08-final-hardening`
- Required B07/master base: `f962cb6dd45c49d0a8cd90f30451980ba034e8f1`
- Safety branch `backup/local-before-b07-sync` was not modified.
- Origin uses SSH: `git@github.com:ahmedAbdelal96/dafter-v1.git`.

## Hardening completed

- Accounting fiscal-year and period status mutations now require the explicit
  `manageFinanceClosure` permission; report reads remain separate through
  `viewFinancialReports` with the legacy `viewReports` compatibility path.
- Staff create/update permission DTOs persist `viewFinancialReports` and
  `manageFinanceClosure` instead of silently dropping them.
- Prisma test pools default to zero idle connections and a short idle timeout.
- Generated dashboard artifacts are excluded from ESLint traversal.
- Prisma schema validation, Prisma client generation, backend build, web
  contract checks, role checks, i18n checks, frontend runtime contracts, and
  the full local test suite were executed.

## Financial integrity evidence

- Full backend suite: 47 suites passed, 226 tests passed.
- Existing accounting integration coverage passed for tenant isolation,
  OPEN/SOFT_CLOSED/CLOSED period behavior, controlled soft-close overrides,
  posted-entry immutability, balanced company/transaction currency lines,
  reversals, and base-currency immutability.
- Financial-report focused tests passed for tenant scoping, Decimal-safe
  aggregation, and reversal netting.

## Gate findings requiring follow-up

- Backend ESLint still reports inherited repository-wide errors (150 errors at
  the first B08 audit, including unused imports, async test doubles, and
  Jest unbound-method assertions). No global rule was weakened or excluded to
  hide these errors.
- Jest tests pass without `--forceExit`, but the process retains open Prisma
  pool handles from test modules and does not terminate promptly. CI retains
  `--forceExit` until each module closes its TestingModule/Prisma instance;
  this is an identified test-lifecycle debt, not a financial-data failure.
- `npm audit` was run against the public npm registry. Backend and dashboard
  dependency reports contain high/critical advisories; several fixes require
  breaking upgrades (Next.js/Swiper/Prisma) and dashboard `xlsx` has no fix.
  No blind `npm audit fix --force` was run.
- Dashboard ESLint passes with warnings only. The warnings are existing React
  Hook Form/compiler compatibility and exhaustive-deps findings.

## Release decision

The release gate remains **not green** until backend lint errors and the
dependency/security review are resolved or explicitly accepted by release
ownership. B08 must not be fast-forwarded to `master` or tagged while these
release-critical findings remain.

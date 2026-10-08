# Naming Inconsistency Report

Date: 2026-04-01

## Canonical Name

- Canonical platform/product name: **Hesba**

## Inconsistent Names Found

- `Hasba`
- `Daftar`
- `dafter`
- Legacy domain labels in docs: `salon`, `beauty`
- Legacy feature vocabulary in older docs/context: `booking`, `bookings`

## Names to Retire

These should be retired from active documentation immediately:
- `Hasba`
- `Daftar`
- `dafter`
- `salon` / `beauty` phrasing where it is legacy-domain residue

## Names/Identifiers to Change Later (Code/Config Refactor Tasks)

The following were intentionally not refactored in this docs-cleanup task and should be handled in dedicated code/config refactors:
- Package/app identifiers in code/config (for example `dafter-*` package names)
- Env/config defaults using `Daftar` or `dafter` values
- i18n/user-facing strings in source code still containing legacy names
- Historical seed/demo emails/domains that include `@daftar.com`
- Script hardcoded local paths pointing to old repository names

## Practical Rule Going Forward

- Documentation baseline: use **Hesba** only.
- Legacy names may remain temporarily in source code/config until targeted refactor tickets are executed.

# Code Quality & Maintainability

## Primary maintainability issues

## 1) Naming inconsistency
**Severity:** Critical  
The repo contains multiple product/domain names. This is one of the strongest maintainability smells in the entire project.

**Impact**
- onboarding friction
- script breakage
- wrong assumptions
- accidental stale config reuse

## 2) Stale docs mixed with real code
**Severity:** High  
Misleading docs are worse than missing docs because they create false confidence.

## 3) Committed generated/temp/runtime artifacts
**Severity:** High  
Examples include:
- log files
- zip files
- tsbuildinfo
- tmp scripts/files
- audit output files
- duplicate CSS files

This increases noise, merge conflicts, and accidental leakage risk.

## 4) Monorepo standards are not enforced
**Severity:** High  
There is no visible strong governance preventing clutter, stale names, and inconsistent patterns.

## 5) Large/centralized coordination files
**Severity:** Medium  
Examples:
- route proxy/middleware logic
- likely large dashboard screens
- large Prisma schema

These are not inherently bad, but they need documentation and tests.

## 6) Shared abstractions appear uneven
**Severity:** Medium  
Some parts show mature structure; other parts feel skeletal or transitional.

## Maintainability recommendations
1. One canonical product name everywhere
2. Root-level contribution standards
3. Forbidden-file rules in CI
4. App-specific ownership/readme files
5. Architectural decision records (ADRs) for:
   - tenancy strategy
   - auth/session model
   - role model
   - shared API client strategy
   - financial transaction boundaries
6. Automated cleanup checks:
   - no tmp files
   - no logs
   - no zip/binary dumps
   - no duplicate “copy/final/final2” assets

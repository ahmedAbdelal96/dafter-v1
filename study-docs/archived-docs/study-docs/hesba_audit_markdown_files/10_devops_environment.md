# DevOps / Environment Audit

## Major findings

## 1) Docker/path naming mismatch appears likely broken
**Severity:** Critical  
Visible compose/config references use `Daftar` / `dafter-*` names, while actual repo folders are `hesba-*`.

**Risk**
- broken local startup
- broken deployment scripts
- wrong container build contexts
- onboarding failure

## 2) CI branch/path mismatch is likely reducing protection
**Severity:** Critical  
Visible backend workflow references non-default branches and old folder names.

## 3) Environment/config naming drift
**Severity:** High  
A project cannot be operationally reliable if environment files and actual app names drift for long.

## 4) Logs/artifacts in repo indicate weak operational boundaries
**Severity:** High  
Operational outputs should not live in source control.

## 5) Observability exists conceptually but needs governance
**Positive**
- logging module
- Sentry
- notification config
- Bull/Redis support

**Needed**
- documented runbooks
- health/readiness definitions
- environment matrix
- secret management documentation

## Recommendations
1. Repair Docker Compose and all build contexts immediately
2. Repair CI triggers/paths
3. Create one environment-variable contract per app
4. Add startup validation for required env vars
5. Add health/readiness probes
6. Add deployment docs that reflect the real system today
7. Separate source repo from operational artifacts

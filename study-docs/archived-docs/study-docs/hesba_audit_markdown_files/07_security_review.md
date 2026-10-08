# Security Review

## Important note
This review is based on visible repository structure and selected code/config files. It is **not** a penetration test or secret scan of the full commit history.

## Major findings

## 1) Runtime/log artifacts are committed
**Severity:** Critical  
**Why it matters:** Logs can contain stack traces, environment details, tenant identifiers, request data, or operational metadata.

**Where**
- root log file(s)
- `logs/` directory artifacts

**Recommendation**
- remove from VCS
- rotate/regenerate outside repo
- add `.gitignore`
- add CI guard preventing logs from being committed

## 2) Zip/binary artifacts are committed
**Severity:** High  
**Why it matters:** Binary archives are opaque to review and can accidentally contain sensitive material or stale code.

**Where**
- root `stitch.zip`

**Recommendation**
- remove from repo
- use release artifacts or external storage if needed

## 3) Swagger exposure should be reviewed for production
**Severity:** Medium  
**Where**
- backend bootstrap exposes `/api/docs`

**Recommendation**
- disable or protect in production
- document intended accessibility

## 4) Cross-origin/cookie/token model requires audit
**Severity:** Medium  
Visible code suggests cross-origin and cookie/JWT patterns across backend and frontend.

**Recommendation**
- verify same-site, secure cookie, domain, and CORS settings
- document SPA/web/mobile auth differences
- test CSRF-related assumptions if cookies are used for auth

## 5) Mixed client/server auth state increases risk of stale or inconsistent authorization UX
**Severity:** Medium  
Not necessarily a server authorization bypass, but it can still produce confusing and potentially unsafe client behavior.

## 6) Encoding issues can affect security visibility
**Severity:** Low to Medium  
Broken text can hide intent in logs/messages and complicate incident response.

## Security recommendations
- run a real secret scan on full history
- add dependency audit to CI
- add security headers/cookie policy review
- formalize redaction in logs
- add role/authorization regression tests
- add file-upload validation review if upload flows exist

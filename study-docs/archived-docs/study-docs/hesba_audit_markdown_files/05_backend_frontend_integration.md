# Backend / Frontend Integration Audit

## Overall assessment
The repository clearly intends a shared product across backend, web, and mobile. The risk is not lack of integration intent; the risk is **contract drift** and **naming drift**.

## Main risks

## 1) Shared naming drift strongly suggests integration mismatch risk
**Severity:** High  
Different naming families appear across repo/config/docs:
- Hesba
- Hasba
- Daftar / dafter
- old beauty-center/bookings domain

This often causes:
- wrong env variables
- wrong API base URLs
- stale script paths
- broken documentation
- developer confusion about current contract

## 2) Role model must be unified explicitly
**Severity:** High  
Visible web/mobile logic uses role-based route access such as:
- OWNER
- STAFF
- SUPER_ADMIN

If backend, web, and mobile do not share one canonical role contract, subtle access bugs appear.

**Recommendation**
- define shared role enums/contracts
- version API auth payloads
- add contract tests for auth/session payload shape

## 3) Auth/session authority chain looks distributed
**Severity:** Medium  
Possible sources include:
- JWT payload
- cookies
- client-persisted user metadata
- route middleware/proxy

This can work, but only if documented rigorously.

**Recommendation**
- publish an auth/session lifecycle document
- define source-of-truth order
- document refresh, logout, token expiry, and revocation flows

## 4) API client sharing is not yet convincing
**Severity:** Medium  
The web app shows a `packages/api-client` area, but its visible footprint is limited. This suggests shared client abstraction may be incomplete.

**Recommendation**
- either invest in a real shared typed API client
- or simplify and keep API access app-local until ready
- avoid half-built abstractions

## 5) Error shape and entitlement handling should be formalized
**Severity:** Medium  
Query provider logic suggests entitlement-aware API behavior. This is a good sign, but it should be encoded contractually.

**Recommendation**
- define typed error families
- define entitlement error schema
- ensure web/mobile render consistent UX for those states

## 6) Locale/i18n behavior should be consistent across layers
**Severity:** Medium  
Web clearly handles locale/RTL concerns. Backend message encoding issues indicate cross-layer localization quality is not fully stable.

**Recommendation**
- define a translation ownership model
- ensure backend error/message keys and frontend rendering are compatible
- verify UTF-8 through the whole toolchain

# Missing Features / Gaps / Incomplete Work

## Visible gaps

## 1) Trustworthy documentation is missing
Even though docs exist, key docs are stale enough that effective current-state documentation is still missing.

## 2) Shared contract layer feels incomplete
A visible `packages/api-client` area exists, but it does not yet look like a mature shared contract/client layer.

## 3) Test coverage for business-critical flows is missing
The most important missing feature from an engineering standpoint is not a UI screen; it is reliability protection.

## 4) Repo governance tooling is missing
Missing or insufficiently visible:
- forbidden-file checks
- naming consistency checks
- encoding checks
- repo cleanliness enforcement

## 5) Likely missing UX hardening
Based on visible structure and large dashboard surfaces, common missing areas may include:
- empty states
- edge-case states
- partial failure handling
- retry/error consistency
- skeleton/loading standardization

These need confirmation by deeper route-by-route review.

## 6) Platform/domain documentation is missing
A system this broad should have docs for:
- tenancy model
- accounting posting model
- auth/session lifecycle
- role matrix
- entitlement model
- event/queue usage
- reporting strategy

## 7) Migration/test governance is missing or underexposed
For a large Prisma schema, strong migration discipline must be obvious. It currently is not.

## Recommended gap-closing order
1. current-state docs
2. CI/DevOps repair
3. business-critical tests
4. contract standardization
5. repo hygiene automation
6. UX hardening pass

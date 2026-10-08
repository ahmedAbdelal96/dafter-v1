# 33 - Tracked Temp Files Audit

Date: 2026-04-01
Repository: Hesba
Scope: `hesba-api-v1` tracked temporary/diagnostic files triage

## File 1
1. Path: `hesba-api-v1/tmp-invoice-create-diag.ts`
2. File type: TypeScript script
3. Apparent purpose: ad-hoc diagnostic repro through Nest application context using `InvoicesService.create(...)`.
4. Risk if kept as-is:
- Misleading location/name (`tmp-*`) inside backend root.
- Hardcoded IDs/date and direct execution pattern may be confused with production code.
5. Recommended action: move to intentional diagnostics location with clearer filename.
6. Confidence level: high.
7. Rationale: script is real diagnostic code (not random junk), but should be organized under scripts/diagnostics.

## File 2
1. Path: `hesba-api-v1/tmp-invoice-create-direct.ts`
2. File type: TypeScript script
3. Apparent purpose: direct use-case/repository diagnostic repro (`CreateInvoiceUseCase`) bypassing full HTTP path.
4. Risk if kept as-is:
- Same root-level noise and accidental usage concerns.
- Hardcoded IDs/date and temporary naming.
5. Recommended action: move to intentional diagnostics location with clearer filename.
6. Confidence level: high.
7. Rationale: useful backend diagnostic script with clear technical value when debugging invoice creation behavior.

## File 3
1. Path: `hesba-api-v1/tmpclaude-172b-cwd`
2. File type: plain text local artifact
3. Apparent purpose: stores a historical local working directory path from another repository naming lineage.
4. Risk if kept as-is:
- Pure local artifact noise.
- Contains stale/legacy path naming (`daftar`/`dafter`) that can mislead.
5. Recommended action: delete.
6. Confidence level: high.
7. Rationale: no runtime/source/diagnostic value; not executable; not a reusable script.

## Summary recommendation
- Relocate two TypeScript diagnostic scripts into `hesba-api-v1/scripts/diagnostics/` with intentional names.
- Delete `tmpclaude-172b-cwd`.
- Add a very small README in diagnostics folder to explain purpose and manual execution expectations.

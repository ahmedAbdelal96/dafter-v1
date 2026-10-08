# Repository Structure Audit

## Root structure
Important root-level directories/files observed:
- `docs/`
- `hesba-api-v1/`
- `hesba-dashboard/`
- `hesba-dashboard-mobile/`
- `load-tests/`
- `logs/`
- `scripts/`
- `stitch/`
- plus root log files, zip files, tmp files, and editor/assistant config directories

## What is good
- Product areas are separated into backend / web / mobile
- Load testing exists as a dedicated concern
- There is some attempt to keep docs/scripts separate

## What is bad
### 1) Root is polluted
Committed root clutter includes:
- log files
- zip archives
- tmp files
- assistant/editor artifacts
- generated outputs

This makes the repo feel operationally unsafe and hard to trust.

### 2) Domain boundaries are visually mixed with junk artifacts
A clean monorepo should make the real code obvious. Here, noise competes with the actual apps.

### 3) Stale and inconsistent naming
Examples of naming families:
- `hesba-*`
- `dafter-*`
- `Daftar`
- Hasba references in memory/context
This likely causes script/config breakage.

## Folder-by-folder notes

### `hesba-api-v1/`
Strong modular backend structure, but polluted by temporary and generated artifacts.

### `hesba-dashboard/`
Reasonable modern frontend structure. However docs inside this app are stale/misaligned, and duplicate assets like `globals copy.css` indicate cleanup debt.

### `hesba-dashboard-mobile/`
Real app structure exists, but there are also many markdown planning/audit artifacts committed directly into the app tree.

### `load-tests/`
Positive sign. Needs governance: how often used, how maintained, and whether tied into CI.

### `logs/`
Should almost certainly not be committed in this form.

### `docs/`
Must be reviewed and rewritten for trustworthiness. Current repo already shows docs that do not match present product reality.

## Structural risks
- Weak repository hygiene
- Harder onboarding because “what matters” is not visually obvious
- Higher chance of broken scripts due to path/name drift
- Greater risk of accidentally shipping internal/generated/debug artifacts

## Structural recommendations
1. Define a strict monorepo policy
2. Remove committed runtime/generated/tmp assets
3. Standardize naming once across all apps and infra
4. Add top-level ownership/architecture docs that reflect the current system
5. Add linting / CI rules for forbidden committed files

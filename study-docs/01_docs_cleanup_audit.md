# Docs Cleanup Audit

Date: 2026-04-01
Canonical product name: **Hesba**

## 1) Documentation files that appear current/useful

| File | Why it appears useful | Recommended action |
|---|---|---|
| `study-docs/00_executive_summary.md` | Current audit context and risks | keep |
| `study-docs/03_backend_audit.md` | Backend-focused technical review | keep |
| `study-docs/04_frontend_audit.md` | Frontend/mobile audit context | keep |
| `study-docs/13_priority_fix_list.md` | Actionable priority list | keep |
| `docs/WEB_MOBILE_PARITY_AUDIT.md` | Recent parity audit tied to implementation state | keep |
| `docs/NEXT_2_SPRINTS_WEB_MOBILE.md` | Near-term sprint planning notes | keep |
| `docs/company_lifecycle_checklist.md` | Concrete lifecycle checklist; implementation-oriented | keep |
| `docs/HASBA_CASH_RECONCILIATION_PHASE1_GUIDE.md` | Feature/operator guide with usable operational detail | update later |
| `docs/HASBA_CASH_RECONCILIATION_PHASE2A_VISIBILITY_GUIDE.md` | Feature visibility guide with usable detail | update later |
| `docs/ux_prompt.md` | UX direction prompt; potentially useful reference | update later |
| `hesba-dashboard/FRONTEND_MODULES_PRIORITY.md` | Prioritization list; may still guide sequencing | update later |
| `hesba-dashboard/FRONTEND_MODULE_CREATION_PROMPT.md` | Build workflow guidance; naming/path drift present | update later |
| `hesba-dashboard/SUPERADMIN_MODULES_PRIORITY.md` | Super-admin roadmap context | update later |
| `hesba-dashboard/SUPERADMIN_SPRINT1_CLOSURE.md` | Historical sprint closure record | keep |
| `hesba-dashboard/SUPERADMIN_SPRINT2_CLOSURE.md` | Historical sprint closure record | keep |
| `hesba-dashboard/SUPERADMIN_SPRINT3_CLOSURE.md` | Historical sprint closure record | keep |
| `hesba-dashboard/SUPERADMIN_SPRINT4_CLOSURE.md` | Historical sprint closure record | keep |
| `hesba-dashboard/SUPERADMIN_SPRINT5_CLOSURE.md` | Historical sprint closure record | keep |
| `hesba-dashboard/SUPERADMIN_SUBSCRIPTION_ENTITLEMENTS_MASTER_PLAN.md` | Subscription/entitlements planning reference | update later |
| `hesba-dashboard/docs/API_CONTRACT_BASELINE.md` | Contract baseline reference | update later |
| `hesba-dashboard/docs/MODULE_DELIVERY_CHECKLIST.md` | Delivery checklist; still process-useful | update later |
| `hesba-dashboard/docs/RBAC_MATRIX.md` | Role/permission reference | keep |
| `hesba-dashboard/docs/DATA_TABLE_GUIDE.md` | UI component usage guide | keep |
| `hesba-dashboard-mobile/MOBILE_IMPLEMENTATION_PLAN.md` | Mobile implementation and parity reference | update later |
| `hesba-dashboard-mobile/MOBILE_MODULE_CREATION_PROMPT.md` | Mobile build guide; useful but naming drift | update later |
| `hesba-dashboard-mobile/MOBILE_PARITY_MATRIX.md` | Mobile parity tracking matrix | update later |
| `hesba-dashboard-mobile/commands.md` | Small utility command note | keep |
| `hesba-api-v1/docs/PLAN.md` | Backend implementation tracking context | update later |
| `hesba-api-v1/docs/PLAN2.md` | Backend phase planning context | update later |
| `hesba-api-v1/docs/Backend_Module_Creation_Guide.md` | Backend module workflow guide | update later |
| `hesba-api-v1/command.md` | Useful command list | keep |
| `hesba-api-v1/prisma/seeds/README.md` | Seed pipeline reference | update later |
| `load-tests/README.md` | Load test instructions | update later |
| `developer_prompt_pack.md` | Prompt/reference pack; not core architecture doc | keep |

## 2) Documentation files that appear outdated or misleading

| File | Issue | Recommended action |
|---|---|---|
| `hesba-dashboard/README.md` (old content) | Legacy beauty/bookings prompt, not a valid project README | replaced with temporary placeholder |
| `hesba-dashboard-mobile/README.md` (old content) | Generic Expo template, not project-specific | replaced with temporary placeholder |
| `hesba-api-v1/README.md` (old content) | Generic NestJS template, not project-specific | replaced with temporary placeholder |
| `docs/DAFTAR_PROJECT_STUDY_AR.md` | Legacy product name/domain and outdated references | archive |
| `docs/Daftar_WhatsApp_Orders_Execution_Spec_AR_v2.md` | Legacy naming and scope assumptions | archive |
| `docs/dafter-system-docs.md` | Legacy naming and outdated architecture framing | archive |
| `docs/implementation_checklist.md` | Legacy naming/path assumptions and encoding issues | archive |
| `docs/Implementation_Plan.md` | Legacy branding and outdated framing | archive |
| `docs/inhancmeent_plan.md` | Legacy scope/encoding issues | archive |
| `docs/NEW_MODULE_PROMPT.md` | Legacy project naming/path references | archive |
| `docs/PRODUCTION_PLAN.md` | Legacy product standardization guidance conflicts with current canonical name | archive |
| `hesba-dashboard/ARCHITECTURE.md` | Salon/bookings architecture and legacy naming | archive |
| `hesba-dashboard/AUTH_FLOW.md` | Salon-role/booking flow assumptions not aligned with current baseline | archive |
| `hesba-dashboard/BOOKINGS_COMPLETION_SUMMARY.md` | Legacy module framing and naming context | archive |
| `hesba-dashboard/CORE_COMPONENTS.md` | Legacy domain examples and inconsistent context | archive |
| `hesba-dashboard/DYNAMIC_NAVIGATION.md` | Salon/super-admin framing and legacy naming | archive |
| `hesba-dashboard/STRUCTURE.md` | Legacy folder/domain assumptions (bookings/salon) | archive |
| `hesba-dashboard-mobile/BOOKINGS_PARITY_AUDIT.md` | References different project names (`zayna-*`) and old scope | archive |
| `study-docs/hesba_audit_markdown_files/*` | Duplicated snapshot set already represented elsewhere | archive |

## 3) Naming inconsistencies found

Detected inconsistent naming in docs/material:
- `Hasba`
- `Daftar`
- `dafter`
- `salon`
- `beauty`
- `booking` / `bookings`

Canonical name moving forward:
- **Hesba**

## 4) Junk/artifact files found

Found and cleaned as safe artifacts:
- Root temp/debug files: `tmp_*` scripts/text outputs
- Runtime/root log: `application-2026-03-19.log`
- `logs/*` generated runtime/audit log files

Found and archived (not deleted) due possible historical value:
- `stitch.zip`
- `study-docs/hesba_audit_markdown_files.zip`

## 5) Recommended action summary

| Category | Action |
|---|---|
| Current useful docs | keep |
| Useful but naming-drift docs | update later |
| Clearly stale/misleading docs | archive |
| Runtime/generated artifacts | delete |
| Ambiguous binary/doc snapshot artifacts | archive |
| Legacy naming in code/config paths and identifiers | rename later |

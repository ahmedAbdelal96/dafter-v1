# Web Export Pattern Audit

## 1) Current Pattern in Customers
- `CustomersPageClient` calls `buildCustomerExportRows(allItems, locale, t)`.
- `customer-export.ts` performs feature-specific row shaping.
- Local translator type: `CustomerExportTranslator = (key: string) => string`.
- Return type: `Record<string, string>[]`.

## 2) Current Pattern in Suppliers
- `SuppliersPageClient` calls `buildSupplierExportRows(allItems, locale, t)`.
- `supplier-export.ts` performs feature-specific row shaping.
- Local translator type: `SupplierExportTranslator = (key: string) => string`.
- Return type: `Record<string, string>[]`.

## 3) Similarities and Differences
Similarities:
1. Same page-level orchestration pattern (fetch-all + utility mapping + Excel export).
2. Same utility signature shape (`items`, `locale`, `t`).
3. Same translator and row types, duplicated textually.

Differences:
1. Feature-specific columns (Customers has credit-limit column; Suppliers does not).
2. Feature-specific money formatter modules.

## 4) Is Shared Helper/Convention Justified Now?
- Yes, but only at a tiny level:
  - shared type primitives for export shaping (`ExportTranslator`, `ExportRow`).
- No justification yet for a generic row-building framework (feature columns still domain-specific).

## 5) Structural Smells / Drift Risks
1. Duplicated local type aliases across export utilities can drift over time.
2. Emerging convention exists but is implicit, not codified.

## 6) Top Cleanup Opportunities
1. Add tiny shared export-shaping type primitives.
2. Align customers/suppliers utilities to import those shared types.
3. Defer broad feature migration until more features adopt the same pattern safely.

## 7) Recommended Narrow Scope For This Pass
- Apply only opportunity #1 + #2:
  - add one tiny shared type file in `src/lib/export`.
  - update customers/suppliers export utilities to use shared types.
- Keep feature-local shaping logic unchanged.

## 8) Confidence Level
- **High** for no-behavior-change alignment.

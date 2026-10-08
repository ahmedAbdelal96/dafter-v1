# 37 - Invoice Flow Structural Audit

Date: 2026-04-01
Scope: `hesba-api-v1` invoice creation flow (focused pass)
Product name: Hesba

## 1) End-to-end flow summary (invoice creation)
- HTTP entry starts at `POST /invoices` in `src/modules/invoices/invoices.controller.ts`.
- Controller delegates to `InvoicesService.create(...)` and wraps response in `ApiResponseDto`.
- Service delegates to `CreateInvoiceUseCase.execute(...)`.
- `CreateInvoiceUseCase` currently performs:
  - party snapshot validation
  - product ownership validation per item
  - item totals computation (quantity * unitPrice)
  - tax + final total calculation
  - issueDate normalization
  - transactional create via repository + audit log
- Persistence is handled by `InvoicesRepository.create(...)` inside `withTransaction(...)`.

## 2) Key classes/files/functions involved
- `src/modules/invoices/invoices.controller.ts`
- `src/modules/invoices/invoices.service.ts`
- `src/modules/invoices/use-cases/create-invoice.use-case.ts`
- `src/modules/invoices/use-cases/update-invoice.use-case.ts`
- `src/modules/invoices/invoices.repository.ts`
- `src/modules/invoices/dto/create-invoice.dto.ts`
- `src/modules/invoices/dto/update-invoice.dto.ts`
- diagnostics:
  - `scripts/diagnostics/invoice-create-via-service.diag.ts`
  - `scripts/diagnostics/invoice-create-via-use-case.diag.ts`

## 3) Responsibility map
- Controller: routing, auth/permissions decorators, response envelope.
- Service: delegation/orchestration facade.
- Use-cases: business/application sequencing.
- Repository: data access, transaction helper, DB writes/reads, audit write helper.

## 4) Structural smells found
1. Duplicate draft-item preparation logic:
- Product validation + item totals + tax/total math appears in both:
  - `create-invoice.use-case.ts`
  - `update-invoice.use-case.ts`

2. Date normalization duplicated/embedded inline:
- `issueDate` UTC normalization is implemented ad hoc in multiple places.

3. Create use-case method is carrying multiple concerns:
- validation, transformation, transaction orchestration, persistence/audit in one method.

4. Weak explicit boundary for "draft payload preparation":
- Shared concept exists but has no dedicated helper/unit.

## 5) Top cleanup opportunities
1. Extract shared invoice draft preparation utilities used by create + update.
2. Reuse a single tax/total computation path for items to reduce divergence risk.
3. Reuse a single issueDate normalization helper for consistent behavior.
4. Keep use-cases focused on orchestration and lifecycle rules.

## 6) Recommended scope for this pass
- Narrow pass only:
  - add one shared helper file for draft-item preparation and date normalization
  - refactor `create-invoice.use-case.ts` and `update-invoice.use-case.ts` to consume it
- No controller/repository contract changes.
- No API shape changes.
- No business-rule redesign.

## 7) Confidence level
- High confidence on identified duplication and safe extraction scope.
- Medium confidence on full invoice module cleanup completeness (intentionally out of scope for this pass).

# Swagger/Runtime Alignment Verification

Date: 2026-04-01
Scope: verification after focused Swagger/runtime alignment changes

## 1) Commands / Checks Run

### Build check
```powershell
npm run build
```
Workdir: `hesba-api-v1`

### Swagger JSON inspection (runtime)
```powershell
node dist/main.js
# then
GET http://127.0.0.1:7000/api/docs-json
```
Validated fields from docs JSON:
- `info.title`
- `components.securitySchemes`
- `/api/v1/auth/refresh` 200 response schema example
- `/api/v1/customers` GET 200 response schema example

### Runtime shape smoke
```powershell
POST http://127.0.0.1:7000/api/v1/auth/forgot-password
GET  http://127.0.0.1:7000/api/v1/health
GET  http://127.0.0.1:7000/api/v1/__missing_route__
```

## 2) What Passed
1. Backend build passed successfully.
2. Swagger title is now `Hesba API`.
3. Swagger security schemes now include: `access-token`, `bearer`, `JWT-auth`.
4. Swagger `POST /api/v1/auth/refresh` now has an explicit 200 response example with envelope/tokens.
5. Swagger `GET /api/v1/customers` example now reflects runtime controller pattern (`data` array + root `meta`).
6. Runtime success check (`/auth/forgot-password`) returned envelope shape.
7. Runtime raw exception check (`/health`) returned raw object shape.
8. Runtime error check (missing route) returned global exception-filter error envelope.

## 3) What Could Not Be Fully Verified
1. Full Swagger accuracy for every endpoint/module in the entire backend was not re-audited in this narrow pass.
2. Full UI-level Swagger rendering behavior in browser (Authorize UX across all operations) was not exhaustively tested; verification used generated JSON and representative endpoint checks.

## 4) Confirmed Alignment Improvements
1. Security scheme naming mismatch risk reduced by adding compatible bearer aliases.
2. Auth refresh/logout/change-password success responses are better documented as envelope-based.
3. Customers list example no longer documents a shape that conflicts with controller runtime output pattern.
4. Raw health exception remains explicit and documented as intentional.

## 5) Remaining Mismatch Areas
1. Several modules still have uneven Swagger detail depth (some endpoints only descriptions without fully explicit examples).
2. Not all list endpoints were audited for `data/meta` example precision in this pass.
3. Error response examples are still not uniformly documented across all controllers (runtime path is consistent, docs coverage varies).

## 6) Confidence Level
- Alignment confidence for targeted endpoints/patterns: high
- Whole-backend Swagger/runtime alignment confidence: medium-high (narrow high-value subset only)

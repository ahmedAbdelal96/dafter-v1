# Auth Sequencing Review Audit

## 1) Current Sequencing Pattern in LoginUseCase
- Flow is explicit and security-ordered:
  1. normalize email
  2. check lockout (cache)
  3. resolve credentials (user + bcrypt compare)
  4. assert user/company eligibility
  5. issue tokens via token service
  6. clear failed attempts
- Invalid credentials path increments attempts before throwing.
- Eligibility path intentionally blocks token issuance before side effects.

## 2) Current Sequencing Pattern in RefreshTokenUseCase
- Flow is explicit and rotation-oriented:
  1. hash incoming refresh token
  2. resolve stored token by hash
  3. validate token usability (revoked/expired)
  4. assert user/company eligibility
  5. revoke old token (rotation)
  6. issue new token pair
- Revoked token reuse triggers full-session revoke path.

## 3) Similarities and Differences
Similarities:
1. both build JWT payload in local helper
2. both assert user/company eligibility before token issuance
3. both keep security-critical sequencing explicit and readable

Differences:
1. login includes lockout + failed-attempt accounting (credential-centric)
2. refresh includes token-family safety behavior (rotation/reuse handling)
3. side effects differ by security model and should remain separated

## 4) Is Shared Cleanup Justified Now?
- Conclusion: **No production-code shared cleanup is justified now**.
- Reason: the remaining overlap is small (helper-level) and extracting now risks hiding distinct security sequencing responsibilities.

## 5) Risks of Over-Abstraction
1. blurring credential flow vs token-rotation flow boundaries
2. reducing readability in security-sensitive control flow
3. coupling future changes across two paths that should evolve independently

## 6) Recommended Narrow Scope
- Option 1 (no-op code decision): keep production code unchanged.
- Validate via targeted auth tests + backend build.
- Document rationale to intentionally resist abstraction.

## 7) Confidence Level
- **High** for no-op production decision and current sequencing clarity.

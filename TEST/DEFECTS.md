# Findings and resolutions

All previously failing automated checks now pass against the isolated H2 environment. Browser checks remain unexecuted. Original failure evidence was preserved under `TEST/runs/before-approved-backend-fix-*`.

## F-01 — Obsolete dashboard test contract: corrected

The legacy `/api/dashboard` route returns 404, but the active dashboard uses `/api/operations/snapshot`. The earlier report incorrectly required the unused endpoint. The unused frontend binding was removed, and the tests now check the active contract and scoped records for admin, technician and customer. No backend dashboard changes were made. Browser navigation remains Not Run.

Evidence: `DASH-01-ADMIN`, `DASH-01-TECHNICIAN`, `DASH-01-CUSTOMER` in [http-cases.json](evidence/http-cases.json).

## F-02 — Catalogue generated-key failure: fixed with approval

The part insert now explicitly requests the generated `id` column, avoiding H2's multiple-generated-column result. The original `POST /api/parts/create` case passes. The complete downstream workflow uses that API-created part; no fallback fixture was used.

Evidence: `PART-02`, `PART-07`, `PART-09` and `INV-02` in [http-cases.json](evidence/http-cases.json). The current run uses H2; live MySQL behavior was not independently certified.

## F-03 — Registration generated-key failure: fixed with approval

User and user-role inserts now explicitly request the `id` column. Registration succeeds with exactly one CUSTOMER role and returns no authentication tokens. The new account can subsequently log in explicitly. Duplicate signup is rejected. Password hashes are no longer printed, and internal exceptions are no longer returned to the client.

Evidence: `AUTH-09-REG`, `AUTH-09-REG-LOGIN`, `AUTH-09-REG-DUPLICATE` in [http-cases.json](evidence/http-cases.json).

## F-04 — Partial registration after failure: fixed with approval

Registration now runs within one transaction and marks it for rollback when an exception occurs. The regression test deliberately rejects the role insert after the user insertion using an external test-only H2 trigger. The API returns a generic failure; both API and direct database inspection confirm that no partial account or role remains.

Evidence: `DB-REG-ROLLBACK` and `DB-REG-ROLLBACK-SQL` in [http-cases.json](evidence/http-cases.json), plus `registrationRollback` in [database-snapshot.json](evidence/database-snapshot.json): one injected role failure, zero remaining accounts, zero remaining roles.

## Scope verification and remaining unverified areas

Only the two approved backend service files changed. No other backend source, schema, pom.xml, .env, credentials or stored procedures changed. See [backend-change-verification.json](evidence/backend-change-verification.json).

- No application setup README was found, so startup *using that README* remains Not Run. Isolated component startup passed.
- Database-outage checks reported a failed save without false success. Authentication uses the database and can return 401 during the outage; user-facing availability messaging was not evaluated interactively.
- No browser is connected. Browser navigation, form cancellation, keyboard operation, responsive layout, browser download interaction and cross-browser compatibility remain Not Run. Static render artifacts are not screenshots.
- No performance target/load profile was supplied. Timings are descriptive observations only.
- Tested permission scenarios are not a general security certification or stakeholder sign-off.

# AutoServe verification summary

Report generated UTC: 2026-11-13T17:10:33.470793+00:00

**Overall: Automated checks passed; browser checks incomplete.** Browser acceptance is not claimed.

| Executed verification | Result |
|---|---|
| Existing backend tests | 32 passed |
| Existing frontend tests | 50 passed |
| TypeScript checking and frontend production build | Passed |
| Supplemental authentication-page static render checks | 6 passed |
| Additional HTTP/database/scenario checks | 159 passed; 0 failed |

No fallback part fixture was used in this run. Checklist aliases and combined workflows reuse evidence; do not add their counts to suite counts.

## Findings

- Dashboard contract corrected: the active frontend uses **/api/operations/snapshot**, which passed for admin, technician and customer. The obsolete /api/dashboard client method was removed.
- Approved generated-key fixes are applied to user, role and part inserts. Part creation and registration are verified by the saved HTTP results.
- Registration rollback is verified using an injected test-only role-insert failure after the user insert. The generic error is returned and no partial account or role remains.

See [DEFECTS.md](DEFECTS.md) for reproduction evidence and provider-specific limits.

## What was verified

The real HTTP workflow ran through a private Vite proxy to the Spring Boot application with the approved service fixes: customer vehicle and service-request creation, linked appointment, admin assignment, check-in, technician parts selection/stock changes, diagnosis, revision and fresh customer approval, completed repair, immutable parts pricing, admin labor, itemized invoice, confirmed payment, and inspection of saved database relationships. Catalogue creation succeeded through the API; no fallback part fixture was used in this run.

Additional checks covered role/ownership restrictions, validation and boundaries, user creation/edit/deactivation, technician availability, notifications, profile/settings persistence, reports, archive/restore, duplicate invoice/payment rejection, database unavailability, and backend stop/recovery through the same Vite process. No live backend process was stopped.

## What remains unverified

No browser was connected. Browser login navigation, protected-URL redirects, actual interactive forms/cancellation, browser download behavior, keyboard use, responsive layout, presentation viewport and cross-browser compatibility are **Not Run**. Static HTML and React component tests do not establish those results. No screenshots were captured.

No application setup README was found, so starting the project *using the README* was not executable as written; the isolated startup succeeded. No performance target/load model was supplied. Response times are descriptive observations only. Permission checks do not constitute a full security assessment. Stakeholder acceptance remains pending.

## Safety and evidence

The user-approved patch was applied only to **UserServices.java and PartsServices.java**. Other backend source, pom.xml, .env and schema files remained unchanged: [scope verification](evidence/backend-change-verification.json). [Applied patch](proposed-fixes/backend-fixes.patch). All write tests used isolated H2 test data. Live MySQL was neither mutated nor certified. Test-only credentials/tokens and generated password hashes are redacted in retained evidence.

- [Complete case records](TEST-CASES.md), [CSV](TEST-CASES.csv), [JSON](test-cases.json).
- [US-01–20 and additional story results](US01-20-TEST-CASES.md).
- [Actual HTTP trace](evidence/http-trace.json), [database snapshot](evidence/database-snapshot.json), [JUnit evidence](evidence/junit), [frontend TAP](evidence/frontend-unit-render.log).
- [Invoice export artifact](evidence/downloaded-invoice.html), [rendered HTML](evidence/rendered).
- [Reproduction instructions and scope rules](README.md).

## Latest interactive browser attempt

Retry UTC: 2026-11-13T17:45:39.313099+00:00. **Brave connected, but navigation and page inspection remain blocked by the integration error. No additional test cases executed.** 54 applicable records remain Not Run; see [remaining cases](REMAINING-TESTS.md). Existing automated pass results are from prior runs and are unchanged.

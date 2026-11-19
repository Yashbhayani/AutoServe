# AutoServe verification summary

Report generated UTC: 2026-11-13T16:50:57.089897+00:00

**Overall: failures found; browser checks incomplete.** This is not an all-tests pass.

| Executed verification | Result |
|---|---|
| Existing backend tests | 32 passed |
| Existing frontend tests | 50 passed |
| TypeScript checking and frontend production build | Passed |
| Supplemental authentication-page static render checks | 6 passed |
| Additional HTTP/database/scenario checks | 153 passed; 3 failed |

One separate fixture-preparation record is excluded from the HTTP/database assertion counts. Checklist aliases and combined workflows reuse evidence; do not add their counts to suite counts.

## Findings

- Dashboard contract corrected: the active frontend uses **/api/operations/snapshot**, which passed for admin, technician and customer. The obsolete /api/dashboard client method was removed.
- Part creation and registration: **generated-key handling fails under H2**. MySQL impact has not been established.
- Failed registration: a **partial account with no roles remains saved** in the isolated database after the failure.

See [DEFECTS.md](DEFECTS.md) for reproduction evidence and provider-specific limits.

## What was verified

The real HTTP workflow ran through a private Vite proxy to the unchanged Spring Boot application: customer vehicle and service-request creation, linked appointment, admin assignment, check-in, technician parts selection/stock changes, diagnosis, revision and fresh customer approval, completed repair, immutable parts pricing, admin labor, itemized invoice, confirmed payment, and inspection of saved database relationships. Catalogue creation failed, so a clearly identified part was seeded as a prerequisite before downstream tests. It remains a failed test.

Additional checks covered role/ownership restrictions, validation and boundaries, user creation/edit/deactivation, technician availability, notifications, profile/settings persistence, reports, archive/restore, duplicate invoice/payment rejection, database unavailability, and backend stop/recovery through the same Vite process. No live backend process was stopped.

## What remains unverified

No browser was connected. Browser login navigation, protected-URL redirects, actual interactive forms/cancellation, browser download behavior, keyboard use, responsive layout, presentation viewport and cross-browser compatibility are **Not Run**. Static HTML and React component tests do not establish those results. No screenshots were captured.

No application setup README was found, so starting the project *using the README* was not executable as written; the isolated startup succeeded. No performance target/load model was supplied. Response times are descriptive observations only. Permission checks do not constitute a full security assessment. Stakeholder acceptance remains pending.

## Safety and evidence

Backend source, pom.xml and .env remained **unchanged**. The proposed backend patch has not been applied; user approval is required. [Review patch](proposed-fixes/backend-fixes.patch). Hash verification: [hash verification](evidence/backend-unchanged.json). All write tests used isolated H2 test data. Live MySQL was neither mutated nor certified. Test-only credentials/tokens and generated password hashes are redacted in retained evidence.

- [Complete case records](TEST-CASES.md), [CSV](TEST-CASES.csv), [JSON](test-cases.json).
- [US-01–20 and additional story results](US01-20-TEST-CASES.md).
- [Actual HTTP trace](evidence/http-trace.json), [database snapshot](evidence/database-snapshot.json), [JUnit evidence](evidence/junit), [frontend TAP](evidence/frontend-unit-render.log).
- [Invoice export artifact](evidence/downloaded-invoice.html), [rendered HTML](evidence/rendered).
- [Reproduction instructions and scope rules](README.md).

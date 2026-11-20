# AutoServe test report

Updated: November 19, 2026.

## Results at a glance

**256 applicable checklist cases are marked Pass; 37 checks are Not Applicable.**

202 checklist passes are supported by saved execution output. The remaining 54 passes were reported by the project owner following their friend’s manual testing. The friend’s original output, screenshots, name and execution date were not supplied. November 19 is the date of that report. Browser automation did not complete an application test; browser passes therefore come from the manual report.

| Saved verification | Result |
|---|---|
| Backend tests | 32 passed |
| Frontend tests | 50 passed |
| HTTP/database checks | 159 passed |
| Static authentication-page checks | 6 passed |
| TypeScript checking and production build | Passed |
| User-story mappings | 26 passed |

The checklist maps requirements to these checks. Its counts overlap with the suite totals and should not be added to them.

## Review guide

1. Open [TEST-CASES.csv](TEST-CASES.csv) for each case’s requirement, inputs, steps, expected and actual results, tester, date and evidence. Manual results are labeled **Reported manual test**.
2. Open [US01-20-TEST-CASES.md](US01-20-TEST-CASES.md) for the original 20 user stories and six additional parts and invoice stories.
3. Consult `evidence/` when checking a specific result. The main records are [backend output](evidence/backend-tests.log), [frontend output](evidence/frontend-unit-render.log), [API/database cases](evidence/http-cases.json), [HTTP trace](evidence/http-trace.json), [database snapshot](evidence/database-snapshot.json) and [manual confirmation](evidence/manual-test-attestation-20261119.json). `evidence/junit/` contains the named backend assertions. The latest frontend cleanup checks are in `evidence/frontend-cleanup-20261119/`.

## Coverage and resolved issues

The saved workflow covers vehicle creation, service request and appointment, technician assignment, check-in, parts selection and stock deduction, diagnosis, customer approval, repair completion, parts and labor invoice, and admin-confirmed payment. Related checks cover roles, ownership, validation, inventory restoration, reporting, notifications and interrupted requests.

Earlier issues with the dashboard request, generated IDs for part and user inserts, and incomplete registration rollback were corrected. The API results include regression checks for those fixes.

Write tests used an isolated H2 database in MySQL compatibility mode. They do not demonstrate live MySQL compatibility. Recorded response times have no supplied performance target. Permission checks cover the tested cases and are not a security certification. Original evidence for the reported manual passes is unavailable.

## Repeating the checks

The application’s frontend tests are in `../tests/`; backend tests are in `../../Backend/src/test/`. The retained test tools support the saved API and render checks. They are optional for reviewing this report.

From the project root, with JDK 25, Maven, Node and frontend dependencies installed:

```sh
python3 Frontend/TEST/run_automated.py
python3 Frontend/TEST/harness/run_http_checks.py
node Frontend/TEST/harness/render_checks.mjs
node --experimental-strip-types Frontend/TEST/harness/save_invoice.mjs
```

These commands write new output. They do not update the manually reported results or automatically refresh this report. Copy the evidence first if the saved run must be retained.

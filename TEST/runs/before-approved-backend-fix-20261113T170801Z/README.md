# AutoServe test evidence

Start with [SUMMARY.md](SUMMARY.md). The result is **failures found; browser checks incomplete**, not an all-tests pass.

Everything produced for this test task is under `TEST`. Backend source/configuration was not changed. The obsolete frontend dashboard API binding was removed, and its tests now use the active operations-snapshot contract. Database writes used isolated H2 fixtures; the configured live MySQL database and your running application were not stopped or modified.

## Evidence and execution records

- [TEST-CASES.md](TEST-CASES.md): checklist and feature-specific case IDs.
- [TEST-CASES.csv](TEST-CASES.csv): preconditions, inputs, steps, expected/actual results, status, tester, date and evidence references.
- [test-cases.json](test-cases.json): full machine-readable checklist.
- [underlying-tests.json](underlying-tests.json): individual existing JUnit and Node test execution records.
- [acceptance.json](acceptance.json) and [US01-20-TEST-CASES.md](US01-20-TEST-CASES.md): user-story mapping, including additional parts/invoice stories.
- [DEFECTS.md](DEFECTS.md): reproduced failures, scope and limitations.
- [evidence/http-trace.json](evidence/http-trace.json): actual HTTP requests/responses through a private Vite proxy; passwords/tokens are redacted.
- [evidence/database-snapshot.json](evidence/database-snapshot.json): relevant saved rows from the isolated database, excluding password hashes and refresh tokens.
- [evidence/junit](evidence/junit): sanitized backend XML evidence.
- [evidence/frontend-unit-render.log](evidence/frontend-unit-render.log): frontend TAP evidence.
- [evidence/rendered](evidence/rendered): actual React-generated authentication-page HTML. These are static render artifacts, not screenshots.
- [evidence/downloaded-invoice.html](evidence/downloaded-invoice.html): invoice export function output using the actual isolated-database invoice. Browser download clicking was not tested.
- [evidence/endpoint-inventory.json](evidence/endpoint-inventory.json): endpoint inventory and observed request coverage. Legacy routes without requests remain Not Run.
- [evidence/response-times.csv](evidence/response-times.csv): descriptive per-request timings, not a load test or performance certification.
- [evidence/backend-unchanged.json](evidence/backend-unchanged.json): backend source/configuration hash comparison.

`evidence/harness-attempt-*` retains earlier execution attempts. The first two encountered external test-launcher setup issues. Later attempts expanded coverage and retained actual application/provider failures. The root-level `evidence/http-cases.json` is the final HTTP execution. Do not combine attempt counts.

## Scope and status rules

**Pass applies only to the recorded layer.** API passes do not establish browser navigation, accessibility, layout or browser compatibility. Parent browser cases are Not Run even when related API, unit or render checks passed. No connected browser was available; no screenshots or keyboard/viewport tests were fabricated.

An operation not implemented for a feature is marked Not Run with `applicable=false`. It is excluded from the applicable-case status counts. Checklist aliases and combined workflows share underlying evidence: their counts must not be added to JUnit/Node totals as independent tests.

H2 runs in MySQL compatibility mode but is not MySQL. Generated-key failures are reproduced under H2 and need confirmation on a disposable MySQL database before claiming production impact. One prerequisite part was seeded after the catalogue-create failure so downstream tests could proceed; catalogue creation still remains Fail.

No response-time requirement was supplied. Timing statistics have no acceptance threshold, controlled concurrency, load model or cross-browser/device coverage. The tested permission scenarios are bounded checks, not a general security certification. Stakeholder acceptance remains pending.

## Reproduce

Requirements: JDK 25, Maven, Node with TypeScript stripping support, and installed frontend dependencies. Run from the project root:

```sh
python3 TEST/run_automated.py
python3 TEST/harness/run_http_checks.py
node TEST/harness/render_checks.mjs
node --experimental-strip-types TEST/harness/save_invoice.mjs
python3 TEST/build_report.py
```

The HTTP launcher compiles only the external test launcher under `TEST/harness/build`, uses unchanged application classes, selects private free ports, overrides database configuration only for its own process, creates fictional test accounts, then stops only its owned processes. It injects a database-connection failure by closing its isolated datasource and tests backend stop/restart using its own JVM. It does not read production account credentials or write production records.

Current report artifacts represent the saved run. Rerunning overwrites root-level logs/results; copy the folder first if preserving this run is required. The compiled dependency classpath is generated by the Maven suite; rerun `run_automated.py` when moving the project to a different path.

Backend fix proposal: [proposed-fixes/README.md](proposed-fixes/README.md). It has not been applied.

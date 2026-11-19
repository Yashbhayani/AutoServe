# Continue AutoServe interactive browser testing

The user requests completion of all applicable interactive tests and evidence saved under `TEST`. Use **Brave**, explicitly selected by the user. Read the Browser skill and use its supported control API.

Current blocker: Brave and Chrome both register, name sessions and create tabs, but page-navigation, DOM-inspection and screenshot methods fail with `Cannot read properties of undefined (reading 'timeoutMs')`. See `TEST/evidence/browser/brave-control-failure.json`. The user has already installed/enabled the extension, restarted the desktop app and browser, and switched browsers. First check whether a fresh chat resolves the control error; do not simply repeat those same setup instructions.

Existing automated results: 32 backend tests, 50 frontend tests, 6 supplemental render checks and 159 HTTP/database checks pass. All 26 automated story mappings pass. Browser tests remain Not Run. Read `TEST/SUMMARY.md`, `TEST/test-cases.json`, and `TEST/DEFECTS.md` before updating results.

Safety/scope: backend modifications require explicit approval. A previous patch affecting only UserServices.java and PartsServices.java was approved, applied and verified; do not make additional backend changes. Do not modify live data or stop the user's running frontend/backend.

If browser controls work, run `python3 TEST/harness/browser_environment.py` using a persistent interactive terminal. It creates private ports, isolated H2 fixtures and fictional accounts. Its output and `TEST/evidence/browser/environment.json` identify the test URL. Seeded account inputs are defined in `TEST/harness/IsolatedServer.java`; use only those fictional test accounts. Commands to the environment process are `dump`, `stop-backend`, `start-backend`, and `stop`. Do not point browser writes at the user's normal localhost:5173 application.

Execute actual UI cases: valid/invalid/empty login, role navigation and restrictions, logout/protected URLs/session refresh, vehicle/request/appointment management and cancellation, diagnosis/parts/approval/repair, admin invoice with labor, invoice viewing/download, admin user management, inventory archive/restore, notifications, reports, keyboard and viewport checks. Retain explicit Not Run results for unsupported browsers, unavailable functionality, or any action requiring user handoff. Do not substitute HTTP or static renders for browser outcomes.

Save steps, preconditions, expected/actual results, tester/date, DOM evidence and screenshots under `TEST/evidence/browser`. Update case CSV/JSON/Markdown and summary consistently. Preserve prior evidence. Stop only the owned isolated processes when finished. Never claim a screenshot, click, browser compatibility, performance target, security certification, or acceptance sign-off without actual evidence.

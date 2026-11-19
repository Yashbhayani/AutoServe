# Remaining test execution status

Retry UTC: 2026-11-13T17:45:39.313099+00:00

**54 applicable checklist records remain Not Run. No additional test passed during this retry.** Brave connected, but navigation and page inspection failed before application interaction.

Diagnostic evidence: [retry record](evidence/browser/remaining-retry-20261113T174539Z.json).

| ID | Test | Scope / blocker |
|---|---|---|
| INT-01 | Start components using the README | Application setup README unavailable |
| INT-02 | Open the supported browser | Browser-control integration failure |
| INT-03 | Perform a backend action and view the response | Browser-control integration failure |
| INT-04 | Create/edit through UI and refresh | Browser-control integration failure |
| INT-05 | Stop backend and attempt request in the UI | Browser-control integration failure |
| INT-06 | Restore backend and retry in the UI | Browser-control integration failure |
| AUTH-01 | Valid login reaches correct authenticated page | Browser-control integration failure |
| AUTH-04 | Submit empty login form | Browser-control integration failure |
| AUTH-05 | Submit invalid email in login form | Browser-control integration failure |
| AUTH-06 | Logout then revisit protected page | Browser-control integration failure |
| AUTH-07 | Open protected URL without login | Browser-control integration failure |
| AUTH-08 | Refresh while logged in | Browser-control integration failure |
| ROLE-01 | Verify pages for each role | Browser-control integration failure |
| ROLE-04 | Direct restricted URL | Browser-control integration failure |
| UI-01 | Click major navigation links, menus and buttons | Browser-control integration failure |
| UI-02 | Check success, validation and error messages interactively | Browser-control integration failure |
| UI-03 | Complete core forms using keyboard and visible labels | Browser-control integration failure |
| UI-04 | Check presentation-size layout | Browser-control integration failure |
| UI-05 | Other supported browsers and screen sizes | Browser-control integration failure |
| NFR-01 | Compare response times against target | Performance target not supplied |
| VEH-08 | Vehicle management: Cancel unconfirmed edit | Browser-control integration failure |
| VEH-10 | Vehicle management: Search/filter/sort | Browser-control integration failure |
| REQ-08 | Service requests: Cancel unconfirmed edit | Browser-control integration failure |
| REQ-10 | Service requests: Search/filter/sort | Browser-control integration failure |
| REQ-11 | Service requests: Empty state | Browser-control integration failure |
| APT-08 | Appointments: Cancel unconfirmed edit | Browser-control integration failure |
| APT-10 | Appointments: Search/filter/sort | Browser-control integration failure |
| APT-11 | Appointments: Empty state | Browser-control integration failure |
| WO-08 | Work orders and assignment: Cancel unconfirmed edit | Browser-control integration failure |
| WO-10 | Work orders and assignment: Search/filter/sort | Browser-control integration failure |
| WO-11 | Work orders and assignment: Empty state | Browser-control integration failure |
| PART-08 | Parts catalogue and inventory: Cancel unconfirmed edit | Browser-control integration failure |
| PART-10 | Parts catalogue and inventory: Search/filter/sort | Browser-control integration failure |
| PART-11 | Parts catalogue and inventory: Empty state | Browser-control integration failure |
| USE-08 | Work-order parts selection: Cancel unconfirmed edit | Browser-control integration failure |
| DIAG-08 | Diagnosis: Cancel unconfirmed edit | Browser-control integration failure |
| APPROVE-08 | Customer approval: Cancel unconfirmed edit | Browser-control integration failure |
| INV-08 | Invoices: Cancel unconfirmed edit | Browser-control integration failure |
| INV-10 | Invoices: Search/filter/sort | Browser-control integration failure |
| INV-11 | Invoices: Empty state | Browser-control integration failure |
| PAY-08 | Confirmed payment records: Cancel unconfirmed edit | Browser-control integration failure |
| USR-08 | Admin user management: Cancel unconfirmed edit | Browser-control integration failure |
| USR-10 | Admin user management: Search/filter/sort | Browser-control integration failure |
| TECH-08 | Technician management: Cancel unconfirmed edit | Browser-control integration failure |
| TECH-10 | Technician management: Search/filter/sort | Browser-control integration failure |
| PROF-08 | Own profile: Cancel unconfirmed edit | Browser-control integration failure |
| SET-08 | Center settings (API present; no active settings route): Cancel unconfirmed edit | Browser-control integration failure |
| DASH-04 | Dashboards: Invalid formats | Browser-control integration failure |
| DASH-05 | Dashboards: Boundary values | Browser-control integration failure |
| DASH-06 | Dashboards: View details | Browser-control integration failure |
| DASH-10 | Dashboards: Search/filter/sort | Browser-control integration failure |
| DASH-11 | Dashboards: Empty state | Browser-control integration failure |
| DASH-12 | Dashboards: Unauthorized role or owner | Browser-control integration failure |
| E2E-UI | Demonstration workflows through browser views | Browser-control integration failure |

Live MySQL compatibility was not tested: docker/mysql/mysqld commands were not found on PATH. This does not establish that no MySQL installation exists elsewhere. No live database was used for write tests.

The previously saved 32 backend, 50 frontend, 6 render and 159 HTTP/database checks remain valid as prior-run evidence. They are not substitutes for the unexecuted browser cases. Backend and application data were unchanged.

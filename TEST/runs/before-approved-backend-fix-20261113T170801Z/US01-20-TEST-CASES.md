# User-story execution evidence

These results apply to the stated automated layer, not stakeholder sign-off. Earlier story wording is retained; the active frontend dashboard uses the scoped operations snapshot, not the removed legacy client request. Browser interaction was not available.

| Story | Requirement | Result | Layer | Evidence |
|---|---|---|---|---|
| US-01 | A customer can register a vehicle and create a request with a linked appointment. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#creation |
| US-02 | Customers cannot read or mutate another customer's records. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#ownership |
| US-03 | An assigned technician follows the six-stage workflow without an estimate. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#workflow |
| US-04 | Repairs cannot be completed before customer approval. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#noBypass |
| US-05 | Only the assigned technician can diagnose, and the customer can request revision. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#diagnosisAndRevision |
| US-06 | Held work cannot advance; hold and resume need reasons. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#holds |
| US-07 | Admins issue final invoices and record confirmed payments once. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#billing |
| US-08 | Customers can reschedule or cancel appointments without deleting the service request. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#appointments |
| US-09 | A failed request rolls back its related database writes. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#rollback |
| US-10 | Profile, service-center settings and technician availability persist. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#settings |
| US-11 | Unstarted requests can be edited and safely unassigned. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#edits |
| US-12 | Restoring an archived part preserves stock and price history. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.ShopIntegrationTests.xml#archiveRestorePreservesStockAndPriceHistory |
| US-13 | An admin assigns exactly one role per user. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.AdminUsersIntegrationTests.xml#rejectsMultipleRoles |
| US-14 | The local email-only password-reset flow revokes previous credentials. | Pass | Actual HTTP / isolated H2; no browser sign-off | evidence/http-cases.json#AUTH-09-RESET |
| US-15 | Signup creates an account without automatically logging in. | Fail | Actual HTTP / isolated H2; no browser sign-off | evidence/http-cases.json#AUTH-09-REG |
| US-16 | Inventory issuing is exactly once under concurrent requests. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.ShopIntegrationTests.xml#concurrentIssueIsExactlyOnce |
| US-17 | Reports use payment dates and do not multiply revenue by selected services. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.ReportsIntegrationTests.xml#reportsUsePaymentDatesAndNeverMultiplyRevenueByServices |
| US-18 | Notifications and mark-read operations remain private to the recipient. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.ShopIntegrationTests.xml#notificationsArePrivateAndReadsPersist |
| US-19 | Dashboard and previously integrated endpoints are mapped and authenticated. | Pass | Actual HTTP / isolated H2; no browser sign-off | evidence/http-cases.json#DASH-01-ADMIN |
| US-20 | The six-stage workflow works over real HTTP with real JWT authentication. | Pass | Actual HTTP / isolated H2; no browser sign-off | evidence/http-cases.json#VEH-02; evidence/http-cases.json#REQ-02; evidence/http-cases.json#WO-02; evidence/http-cases.json#DIAG-02; evidence/http-cases.json#APPROVE-02; evidence/http-cases.json#WO-COMPLETE; evidence/http |
| US-21 | Assigned technicians and admins choose parts; quantities deduct stock and unused parts return it. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#quantitiesDeductAndUnusedPartsReturnWithoutDoubleDeduction |
| US-22 | Parts and diagnoses require fresh customer approval; closed stages reject parts edits. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#onlyAdminOrAssignedTechnicianMaySelectPartsDuringDiagnosis |
| US-23 | Invoices snapshot approved parts prices and add admin-entered labor using server-computed totals. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#approvalAndInvoiceUseFrozenPricesPlusAdminLabor |
| US-24 | Inventory issuing shares the diagnosis stock and approval workflow. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#inventoryIssuingUsesTheSameFrozenQuoteAndCannotIssueAfterSubmission |
| US-25 | Concurrent parts changes cannot deduct stock twice. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#concurrentAssignmentsCannotConsumeMoreStockThanAvailable |
| US-26 | Customers can only access their own invoice line items. | Pass | JUnit service/integration assertions | evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#snapshotScopesPartsAndInvoiceBreakdownToAuthorizedAccount |

The report includes the original 20 stories plus the additional parts/invoice stories. US-15 still fails under the H2 provider; US-19 now passes against the current snapshot-based frontend contract. A passing frontend mock does not override either actual integration failure.

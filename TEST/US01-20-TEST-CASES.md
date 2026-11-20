# User-story results

The saved automated results cover the original 20 stories and six parts and invoice stories. All 26 mappings pass. The browser results are reported manual passes, as explained in [README.md](README.md).

| Story | Requirement | Result | Evidence |
|---|---|---|---|
| US-01 | A customer can register a vehicle and create a request with a linked appointment. | Pass | [creation](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#creation) |
| US-02 | Customers cannot read or mutate another customer's records. | Pass | [ownership](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#ownership) |
| US-03 | An assigned technician follows the six-stage workflow without an estimate. | Pass | [workflow](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#workflow) |
| US-04 | Repairs cannot be completed before customer approval. | Pass | [noBypass](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#noBypass) |
| US-05 | Only the assigned technician can diagnose, and the customer can request revision. | Pass | [diagnosisAndRevision](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#diagnosisAndRevision) |
| US-06 | Held work cannot advance; hold and resume need reasons. | Pass | [holds](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#holds) |
| US-07 | Admins issue final invoices and record confirmed payments once. | Pass | [billing](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#billing) |
| US-08 | Customers can reschedule or cancel appointments without deleting the service request. | Pass | [appointments](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#appointments) |
| US-09 | A failed request rolls back its related database writes. | Pass | [rollback](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#rollback) |
| US-10 | Profile, service-center settings and technician availability persist. | Pass | [settings](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#settings) |
| US-11 | Unstarted requests can be edited and safely unassigned. | Pass | [edits](evidence/junit/TEST-com.example.DevAutoServ.OperationsIntegrationTests.xml#edits) |
| US-12 | Restoring an archived part preserves stock and price history. | Pass | [archiveRestorePreservesStockAndPriceHistory](evidence/junit/TEST-com.example.DevAutoServ.ShopIntegrationTests.xml#archiveRestorePreservesStockAndPriceHistory) |
| US-13 | An admin assigns exactly one role per user. | Pass | [rejectsMultipleRoles](evidence/junit/TEST-com.example.DevAutoServ.AdminUsersIntegrationTests.xml#rejectsMultipleRoles) |
| US-14 | The local email-only password-reset flow revokes previous credentials. | Pass | [AUTH-09-RESET](evidence/http-cases.json#AUTH-09-RESET) |
| US-15 | Signup creates an account without automatically logging in. | Pass | [AUTH-09-REG](evidence/http-cases.json#AUTH-09-REG) |
| US-16 | Inventory issuing is exactly once under concurrent requests. | Pass | [concurrentIssueIsExactlyOnce](evidence/junit/TEST-com.example.DevAutoServ.ShopIntegrationTests.xml#concurrentIssueIsExactlyOnce) |
| US-17 | Reports use payment dates and do not multiply revenue by selected services. | Pass | [reportsUsePaymentDatesAndNeverMultiplyRevenueByServices](evidence/junit/TEST-com.example.DevAutoServ.ReportsIntegrationTests.xml#reportsUsePaymentDatesAndNeverMultiplyRevenueByServices) |
| US-18 | Notifications and mark-read operations remain private to the recipient. | Pass | [notificationsArePrivateAndReadsPersist](evidence/junit/TEST-com.example.DevAutoServ.ShopIntegrationTests.xml#notificationsArePrivateAndReadsPersist) |
| US-19 | Dashboard and previously integrated endpoints are mapped and authenticated. | Pass | [DASH-01-ADMIN](evidence/http-cases.json#DASH-01-ADMIN) |
| US-20 | The six-stage workflow works over real HTTP with real JWT authentication. | Pass | [VEH-02](evidence/http-cases.json#VEH-02); [REQ-02](evidence/http-cases.json#REQ-02); [WO-02](evidence/http-cases.json#WO-02); [DIAG-02](evidence/http-cases.json#DIAG-02); [APPROVE-02](evidence/http-cases.json#APPROVE-02); [WO-COMPLETE](evidence/http-cases.json#WO-COMPLETE); [INV-02](evidence/http-cases.json#INV-02); [PAY-02](evidence/http-cases.json#PAY-02); [DB-01](evidence/http-cases.json#DB-01) |
| US-21 | Assigned technicians and admins choose parts; quantities deduct stock and unused parts return it. | Pass | [quantitiesDeductAndUnusedPartsReturnWithoutDoubleDeduction](evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#quantitiesDeductAndUnusedPartsReturnWithoutDoubleDeduction) |
| US-22 | Parts and diagnoses require fresh customer approval; closed stages reject parts edits. | Pass | [onlyAdminOrAssignedTechnicianMaySelectPartsDuringDiagnosis](evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#onlyAdminOrAssignedTechnicianMaySelectPartsDuringDiagnosis) |
| US-23 | Invoices snapshot approved parts prices and add admin-entered labor using server-computed totals. | Pass | [approvalAndInvoiceUseFrozenPricesPlusAdminLabor](evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#approvalAndInvoiceUseFrozenPricesPlusAdminLabor) |
| US-24 | Inventory issuing shares the diagnosis stock and approval workflow. | Pass | [inventoryIssuingUsesTheSameFrozenQuoteAndCannotIssueAfterSubmission](evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#inventoryIssuingUsesTheSameFrozenQuoteAndCannotIssueAfterSubmission) |
| US-25 | Concurrent parts changes cannot deduct stock twice. | Pass | [concurrentAssignmentsCannotConsumeMoreStockThanAvailable](evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#concurrentAssignmentsCannotConsumeMoreStockThanAvailable) |
| US-26 | Customers can only access their own invoice line items. | Pass | [snapshotScopesPartsAndInvoiceBreakdownToAuthorizedAccount](evidence/junit/TEST-com.example.DevAutoServ.PartsBillingIntegrationTests.xml#snapshotScopesPartsAndInvoiceBreakdownToAuthorizedAccount) |

# AutoServe workflow safeguards and demo data

## Goal and constraints
Improve the existing responsive React/Vite/Tailwind v4 prototype without redesigning it, replacing its History API router, adding dependencies, or removing existing records or features. Retain union-of-roles permissions and highest-privilege route resolution. This remains a mock client-side application, not production authentication or a backend authorization boundary.

Confirmed decisions:
- Add six fictional customers and eight service requests/work orders in addition to existing records.
- Any open, unassigned request is assignment-eligible; Available and Busy technicians are eligible, Off technicians are not.
- Reject returns an estimate for correction rather than closing a request.
- Hold is an assignment status; preserve the repair stage. Both admins and assigned technicians can hold/resume.
- Both Hold and Resume require a nonblank reason.
- Changes survive refresh in the same tab using sessionStorage.
- Enforce customer ownership in views and mutations, including direct URLs.
- Keep estimate approval, assignment, customer consent, and completion distinct.

## Repository grounding
- `src/store/AppContext.tsx`: shared mutable state and workflow actions; currently only sign-in state persists. `reviewEstimate` supports send/revise but not reject. Assignment creation replaces another assignment for the request. Assignment updates accept arbitrary status changes.
- `src/data/mock.ts`: records and types; seven repair stages, four separate assignment statuses. Vehicles currently lack ownership.
- `src/pages/admin.tsx`: request list, assignment editor, review/consent modals and dashboard. Creation currently falls back to existing requests and the selector includes assigned/completed requests.
- `src/pages/technician.tsx`: assigned work orders, detail/actions and time logs. Detail already denies nonassigned technicians; admin-only users currently lack a Work Orders route.
- `src/pages/customer.tsx`: customer screens currently consume shared collections; several detail pages fall back to unrelated records when an ID does not resolve.
- `src/components/AppShell.tsx`: merged role menus with deduplication, currently ungrouped.
- `src/components/workflow.tsx`: reusable estimate/history rendering and revision-note detection.
- `src/App.tsx`, `src/router.tsx`: role route tables and custom router; preserve these patterns.

## Implementation

### 1. Identity, ownership and scoped reads
Add stable account IDs to the login directory and link existing users/accounts by normalized email. Add required `customerId` to vehicles; request ownership derives from its vehicle, and appointment/invoice ownership derives from their vehicle and matching request where applicable. Attribute existing v1/v2/v3 and their related records to John Doe, preserving his current demo. Customers with no vehicles see empty states, not someone else's records.

Expose current account identity and centralized ownership predicates plus a customer-scoped read hook/selector from the store. Update all customer dashboard, vehicle, request, appointment, approval, status, invoice and history screens to use this scope even when the account also has technician/admin roles. Admin operations continue to use full collections; technician operations retain assigned-job scoping. Customer profile welcomes the actual signed-in name.

Remove unrelated-record fallback behavior from detail URLs. Missing or foreign record IDs show the existing not-found/empty-state style and no actionable controls. Distinguish a vehicle creation route from an invalid edit ID.

Guard vehicle CRUD, request creation/check-in, appointment CRUD and consent actions in the store. Customer mutations must reference owned vehicles/records; do not accept an owner supplied by the caller. Admin actions remain explicitly permitted. Technician check-in is limited to assigned work. Validate appointment request/vehicle linkage. Validate approved repair IDs belong to the current estimate and include at least one valid line. Whitelist editable check-in fields so `Partial<ServiceRequest>` cannot overwrite ID, ownership linkage, technician, stage, or estimate data.

Notifications gain audience metadata (account ID and/or permitted role audience); route customer-facing notifications to the owner and operational notifications to their intended staff audience. Filter the topbar, notification page, unread count and mark-all-read by that audience. Treat the existing seed notifications as John's customer notifications. Unknown audience must not default to customer visibility.

### 2. Guarded admin estimate decisions
Extend `reviewEstimate` to `send | reject | revise`, retaining `send` internally while labeling the UI **Approve** and explaining that it sends the estimate for customer approval.

Only an admin may act, only on a non-held request in `Pending Admin Review`. Approve validates a diagnosis and at least one valid estimate line, recalculates shared prices, and transitions to `Awaiting Customer Approval`; it does not assign a technician, start repair, complete an assignment, or record customer consent.

Reject and Request Revision require a trimmed reason in both UI and store. Both transition to `Diagnosed`, retain the diagnosis/estimate for correction, clear stale line approval flags and log distinct attributed events. Display the reason through the existing revision-note/history components. Resubmission must pass admin review again before customer approval. Customer rejection likewise returns to correction and clears stale approval flags.

Return a small structured success/error result from changed workflow actions so dialogs stay open on failure and pages do not navigate after denied mutations. Keep existing notification feedback and use inline field errors where available. Validate again against current state on submission; serialize related request/assignment changes to prevent duplicate rapid submissions or stale modal updates.

### 3. Assignment eligibility and separation of concerns
Centralize an eligibility selector: request exists, repair stage is not Completed, no assignment record exists, and no mirrored technicianId exists. This same selector drives creation choices, store validation, the Unassigned tab and counts. A request with inconsistent linkage is not silently overwritten.

- **Assign Service** opens creation only, preselecting the first eligible request and first non-Off technician. It is disabled when no eligible requests or technicians exist, with a short explanatory empty-state message.
- Creation shows only eligible requests and Available/Busy technicians. New assignment status is Assigned; creation never accepts On Hold or Completed.
- Store creation rejects duplicate, missing, completed or technician-linked requests and Off/missing technicians. Never remove an existing assignment as a side effect of creation.
- Editing/reassignment is explicit and keeps requestId immutable. Reassignment requires admin permission and a non-Off target; it updates the mirrored technicianId without changing repair stage or customer approval. Existing Off assignees may remain visible but cannot be newly selected as a reassignment target.
- General editing cannot set On Hold, resume a held job, or mark Completed. Hold/resume use dedicated actions. Completed is only produced by repair completion, which retains the existing unique-invoice behavior. A completed assignment is read-only in this workflow.
- Removal/unassignment remains admin-only and is blocked for held/completed jobs; require resuming before removing a held assignment. Preserve request stage and append history for allowed unassignment.

Add a clickable **Unassigned Requests** dashboard statistic that uses the shared eligibility count and opens `/admin/requests?tab=Unassigned`. Treat this as an actionable current backlog independent of the dashboard date range; label this behavior clearly, and do not append a date filter to this link.

### 4. Reason-required Hold and Resume
Extend `ServiceAssignment` with `holdReason` and `resumeStatus` (Assigned or In Progress). Add explicit hold/resume store actions receiving assignment ID and reason and returning success/error.

Hold requires an existing open assignment in Assigned/In Progress and either admin permission or the matching assigned technician identity. Save its previous status, set On Hold, preserve request stage and estimate/consent state, and append history with actor, capacity, timestamp and trimmed reason. Resume requires On Hold and the same authorization, requires a new reason, restores the saved status and logs the event. Legacy held records without a saved prior status restore Assigned deterministically.

Show dedicated actions and reason dialogs in admin request details and assigned technician work-order details. Display the current hold reason prominently. While held, block check-in, estimate save/submit/review, consent transitions, repair completion, new part requests and new time logs for that job, in both controls and store guards. Allow read-only access, notes/history inspection and admin processing of already-created part requests. Do not represent On Hold as an eighth repair stage.

### 5. Role-filtered sidebar groups
Invoke the applicable design-system skill before implementing UI changes; retain current colors, icons, spacing, active states and responsive drawer behavior.

Group the merged role menu in this exact order:
- **Overview:** Dashboard.
- **Operations:** Service Requests, Work Orders, Appointments, Time Logs; retain existing My Jobs, My Vehicles, Service History and Invoices links here for roles that already have them.
- **Management:** Technicians, Users, Inventory, Reports; retain technician Parts access in this group, deduplicating it against Inventory for admin/technician combinations.
- **Account:** Settings, Profile, Logout.

Show only permitted entries; suppress empty groups. Keep one entry per existing feature/slug and preserve admin > technician > customer precedence. Settings remains admin-only. Logout remains an action and appears inside Account.

Add admin list/detail Work Orders routes reusing current components with admin-wide read access and guarded actions; adjust route matching and breadcrumbs without replacing the router. Technician-only Work Orders remain assigned-only. Normalize sidebar label to Time Logs while keeping existing paths. Do not grant missing role capabilities solely because a link is now grouped differently.

### 6. Additive coherent demo records
Add six Active Customer users with login accounts, each with one owned vehicle. Use unique IDs, fictional contact details, realistic vehicle attributes, and relative dates. Reuse current image conventions/assets rather than introducing new dependencies or an imagery redesign.

Add eight requests with these exact starting states:
1. Requested, unassigned.
2. Checked In, unassigned.
3. Diagnosed, assigned.
4. Pending Admin Review, assigned.
5. Awaiting Customer Approval, assigned.
6. In Repair, assignment In Progress, approved estimate lines.
7. Completed, assignment Completed, approved lines and linked invoice.
8. In Repair, assignment On Hold, prior status In Progress, hold reason and customer consent history.

Spread the eight requests across the six new customers (two receive a second request). Use existing technicians, including a Busy assignee where appropriate; no new assignments to Off technicians. Include realistic concern/diagnosis, inventory-linked part quantities, labor hours at shared rate, consistent totals and attributed stage histories. Link relevant appointments and the completed invoice without modifying existing records. Existing fixture inconsistencies outside this scope are not silently rewritten.

### 7. Same-tab persistence
Persist one versioned sessionStorage snapshot containing every mutable collection, labor rate, and the mutable login directory (including newly registered technician/customer accounts). Retain the current sign-in keys for compatibility, but parse role data safely and resolve identity through the account directory rather than treating cached role claims as authority.

Hydrate once before first persistence, then write snapshots on state changes. Preserve changes when signing out and into another demo account in the same tab; sign-out clears authentication, not shop records. Restore accounts before login lookup. Use collision-safe generated IDs across refresh rather than the resettable module counter or length-based IDs.

Validate version and collection shapes/references before using stored state. Fall back to seeds for malformed or incompatible snapshots; catch storage exceptions and show a nonfatal persistence warning rather than crashing or claiming changes were saved. Do not introduce localStorage, cross-tab synchronization, a backend or a user-facing reset feature.

## Verification strategy
This is a broad workflow change: use the existing `pnpm build` entry point, not a new test framework, dependency or development server. Use existing `pnpm format` with intended file paths if formatting is needed. Check critical flows through the already-running preview using available browser capabilities; do not poll logs unless investigating a concrete failure.

Critical checks:
1. Admin Approve reaches customer approval only; Reject/Revision reject empty reasons, preserve correction data, and require resubmission. Nonadmin/stale-state calls are denied.
2. Assign an open unassigned request to a Busy technician; verify mirrored linkage/count decrement. Reject duplicates, Completed requests and Off technicians. Verify disabled empty creation state and explicit reassignment.
3. Admin and matching technician Hold/Resume require reasons, restore assignment status, preserve repair stage and produce history. Unassigned technicians cannot act; held jobs cannot progress or bypass the guard through the assignment editor.
4. Customer consent is required before repair completion. Invalid repair IDs, foreign requests and unapproved stages are denied. Completion updates both models once and does not duplicate invoices.
5. Sign into two different customers; verify scoped dashboard/list/detail/vehicle/appointment/invoice/history/notification data and direct foreign IDs. Verify customer mutations cannot target foreign data, including mixed-role customer views.
6. Refresh after an estimate decision, assignment, hold and record creation; verify restored records, accounts, ID uniqueness and sign-in. Exercise malformed snapshot fallback without touching unrelated storage.
7. Check sidebar roles for customer-only, technician-only, admin-only and existing mixed-role accounts; check every existing navigation destination, newly enabled admin work orders, active states, back/forward and desktop/mobile drawer behavior.
8. Confirm additive totals: six more customers, six more vehicles, eight more requests, stage coverage and at least two eligible unassigned requests; no original IDs removed.

Report checks actually executed and their outcomes separately from planned/untested coverage. Report environmental limitations or pre-existing fixture/navigation failures explicitly. Do not claim production security or complete automated coverage.

## Non-goals
No visual redesign, new dependencies, backend, new role model, router replacement, unrelated reports/settings improvements, production credentials, test-framework setup or cleanup of unrelated seed history inconsistencies.

## Completion criteria
All requested actions are guarded centrally and reflected coherently in existing UI; ownership and same-tab persistence apply consistently; new fixtures are additive and linked; sidebar preserves navigation under the requested grouping; critical checks and any remaining verification limitations are stated accurately.

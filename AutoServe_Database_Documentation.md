# AutoServe — Database Design Documentation

**Database Engine:** MySQL 8.x  
**Character Set:** utf8mb4 / utf8mb4_unicode_ci  
**Total Tables:** 17

This document describes every table in the updated AutoServe schema. It is designed to accompany the ER Diagram and the database schema SQL in the System Design section of the report.

## 1. Design Change Summary

The original design stored several business values directly in application columns, including service type values and status values. The updated design introduces reusable lookup/master tables so these values can be managed centrally.

### New lookup tables

1. **`service_types`** — master list of services offered by AutoServe.
2. **`statuses`** — centralized status definitions for all workflow tables.

### Standard code convention

Business lookup/master records now use a short, stable `code` in addition to the numeric primary key.

| Table | Code Field | Example | Unique Constraint |
|---|---|---|---|
| `roles` | `code` | `CUSTOMER` | `UNIQUE(code)` |
| `service_types` | `code` | `OIL_CHANGE` | `UNIQUE(code)` |
| `statuses` | `code` | `SUBMITTED` | `UNIQUE(table_code, code)` |

The numeric `id` remains the internal primary/foreign-key identifier. The `code` is the stable business identifier used by application logic, APIs, seed data, configuration, and reporting.

### Status management

`statuses` is a shared status-definition table. A status is identified by both the table/workflow it belongs to and its status code. Therefore, the same code can safely exist in different workflows when required.

For example:

- `service_requests` → `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `appointments` → `SCHEDULED`, `CONFIRMED`, `RESCHEDULED`, `CANCELLED`, `COMPLETED`
- `check_ins` → `PENDING`, `ARRIVED`, `VERIFIED`
- `work_orders` → `OPEN`, `DIAGNOSING`, `AWAITING_APPROVAL`, `IN_PROGRESS`, `COMPLETED`
- `recommended_repairs` → `PENDING`, `APPROVED`, `REJECTED`
- `invoices` → `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `VOID`
- `payments` → `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`

This removes hard-coded ENUM lists from transactional tables and allows administrators to manage supported statuses through data rather than schema changes.

---

# 2. Users, Roles & Access

## 2.1 `users`

Stores every person who can log in — customers, technicians, and admins share this one table; their role(s) come from `user_roles`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Unique user ID |
| username | VARCHAR(50) | NOT NULL, UNIQUE | Login name, used in `/u/{username}/...` routes |
| email | VARCHAR(120) | NOT NULL, UNIQUE | Email address used for OTP/notifications |
| phone | VARCHAR(20) | NULL | Mobile number used for SMS OTP |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password; never stored in plain text |
| is_email_verified | BOOLEAN | DEFAULT FALSE | Set true after email OTP is confirmed |
| is_phone_verified | BOOLEAN | DEFAULT FALSE | Set true after SMS OTP is confirmed |
| is_active | BOOLEAN | DEFAULT TRUE | Deactivates accounts without deleting them |
| created_at | DATETIME | DEFAULT NOW | Account creation timestamp |
| updated_at | DATETIME | AUTO-UPDATED | Last profile update timestamp |

## 2.2 `roles`

Lookup table containing the roles supported by the system.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TINYINT UNSIGNED | PK, AUTO_INCREMENT | Internal role ID |
| code | VARCHAR(30) | NOT NULL, UNIQUE | Stable role code such as `CUSTOMER`, `TECHNICIAN`, `ADMIN` |
| name | VARCHAR(50) | NOT NULL | Display name of the role |
| description | VARCHAR(255) | NULL | Optional explanation of the role |
| is_active | BOOLEAN | DEFAULT TRUE | Allows a role to be disabled without deleting historical assignments |
| created_at | DATETIME | DEFAULT NOW | Creation timestamp |
| updated_at | DATETIME | AUTO-UPDATED | Last update timestamp |

**Unique field:** `code`

**Seed role codes:**

- `CUSTOMER`
- `TECHNICIAN`
- `ADMIN`

## 2.3 `user_roles`

Junction table linking users to one or more roles, supporting the multi-role requirement.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Row ID |
| user_id | BIGINT UNSIGNED | FK → users.id, CASCADE | The user |
| role_id | TINYINT UNSIGNED | FK → roles.id, RESTRICT | Assigned role |
| assigned_at | DATETIME | DEFAULT NOW | When the role was granted |

**Unique field:** `(user_id, role_id)`

A user cannot be assigned the same role twice.

---

# 3. Service Type & Service Requests

## 3.1 `service_types`

Master table for the services offered by AutoServe. This replaces the free-text `service_type` value previously stored in `service_requests`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SMALLINT UNSIGNED | PK, AUTO_INCREMENT | Service type ID |
| code | VARCHAR(50) | NOT NULL, UNIQUE | Stable service code, e.g. `OIL_CHANGE` |
| name | VARCHAR(100) | NOT NULL | Customer-facing service name |
| description | VARCHAR(500) | NULL | Description of the service |
| is_active | BOOLEAN | DEFAULT TRUE | Whether the service can currently be selected |
| created_at | DATETIME | DEFAULT NOW | Creation timestamp |
| updated_at | DATETIME | AUTO-UPDATED | Last update timestamp |

**Unique field:** `code`

**Example service codes:**

- `OIL_CHANGE`
- `BRAKE_REPAIR`
- `TIRE_SERVICE`
- `ENGINE_DIAGNOSTIC`
- `BATTERY_REPLACEMENT`
- `AC_SERVICE`
- `GENERAL_INSPECTION`

The list above is an example seed set. The application can add additional service types without changing the transactional table structure.

## 3.2 `service_requests`

A customer's request for service — the starting point of the repair workflow.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Request ID |
| customer_id | BIGINT UNSIGNED | FK → users.id, CASCADE | Requesting customer |
| vehicle_id | BIGINT UNSIGNED | FK → vehicles.id, CASCADE | Vehicle needing service |
| service_type_id | SMALLINT UNSIGNED | FK → service_types.id, RESTRICT | Requested service |
| description | TEXT | NULL | Customer's description of the problem |
| photo_urls | TEXT | NULL | JSON array of S3 photo URLs |
| preferred_date | DATE | NULL | Customer's requested date |
| status_id | SMALLINT UNSIGNED | FK → statuses.id, RESTRICT | Current service-request status |
| created_at | DATETIME | DEFAULT NOW | Record creation timestamp |
| updated_at | DATETIME | AUTO-UPDATED | Last update timestamp |

The previous `service_type VARCHAR(80)` column is replaced by `service_type_id`.

The previous `status ENUM` column is replaced by `status_id`.

---

# 4. Status Management

## 4.1 `statuses`

Centralized lookup table containing status values for all workflow tables.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SMALLINT UNSIGNED | PK, AUTO_INCREMENT | Internal status ID |
| table_code | VARCHAR(50) | NOT NULL | Code identifying the workflow/table that owns the status |
| code | VARCHAR(50) | NOT NULL | Stable status code |
| name | VARCHAR(100) | NOT NULL | Display name |
| description | VARCHAR(255) | NULL | Meaning of the status |
| sort_order | SMALLINT UNSIGNED | DEFAULT 0 | Display/workflow ordering |
| is_initial | BOOLEAN | DEFAULT FALSE | Indicates the normal starting status |
| is_terminal | BOOLEAN | DEFAULT FALSE | Indicates a completed/closed status |
| is_active | BOOLEAN | DEFAULT TRUE | Whether the status is currently available |
| created_at | DATETIME | DEFAULT NOW | Creation timestamp |
| updated_at | DATETIME | AUTO-UPDATED | Last update timestamp |

**Unique field:** `(table_code, code)`

This composite unique constraint is important. `CANCELLED`, for example, can exist for both `service_requests` and `appointments`, but there must not be two `CANCELLED` definitions inside the same workflow.

### `table_code` values

| Table Code | Applies To |
|---|---|
| `SERVICE_REQUEST` | `service_requests.status_id` |
| `APPOINTMENT` | `appointments.status_id` |
| `CHECK_IN` | `check_ins.status_id` |
| `WORK_ORDER` | `work_orders.status_id` |
| `RECOMMENDED_REPAIR` | `recommended_repairs.status_id` |
| `INVOICE` | `invoices.status_id` |
| `PAYMENT` | `payments.status_id` |

### Complete status definitions

| Table Code | Status Code | Name | Initial | Terminal |
|---|---|---|---|---|
| SERVICE_REQUEST | SUBMITTED | Submitted | Yes | No |
| SERVICE_REQUEST | UNDER_REVIEW | Under Review | No | No |
| SERVICE_REQUEST | APPROVED | Approved | No | No |
| SERVICE_REQUEST | REJECTED | Rejected | No | Yes |
| SERVICE_REQUEST | IN_PROGRESS | In Progress | No | No |
| SERVICE_REQUEST | COMPLETED | Completed | No | Yes |
| SERVICE_REQUEST | CANCELLED | Cancelled | No | Yes |
| APPOINTMENT | SCHEDULED | Scheduled | Yes | No |
| APPOINTMENT | CONFIRMED | Confirmed | No | No |
| APPOINTMENT | RESCHEDULED | Rescheduled | No | No |
| APPOINTMENT | CANCELLED | Cancelled | No | Yes |
| APPOINTMENT | COMPLETED | Completed | No | Yes |
| CHECK_IN | PENDING | Pending | Yes | No |
| CHECK_IN | ARRIVED | Arrived | No | No |
| CHECK_IN | VERIFIED | Verified | No | Yes |
| WORK_ORDER | OPEN | Open | Yes | No |
| WORK_ORDER | DIAGNOSING | Diagnosing | No | No |
| WORK_ORDER | AWAITING_APPROVAL | Awaiting Approval | No | No |
| WORK_ORDER | IN_PROGRESS | In Progress | No | No |
| WORK_ORDER | COMPLETED | Completed | No | Yes |
| RECOMMENDED_REPAIR | PENDING | Pending | Yes | No |
| RECOMMENDED_REPAIR | APPROVED | Approved | No | Yes |
| RECOMMENDED_REPAIR | REJECTED | Rejected | No | Yes |
| INVOICE | DRAFT | Draft | Yes | No |
| INVOICE | ISSUED | Issued | No | No |
| INVOICE | PARTIALLY_PAID | Partially Paid | No | No |
| INVOICE | PAID | Paid | No | Yes |
| INVOICE | VOID | Void | No | Yes |
| PAYMENT | PENDING | Pending | Yes | No |
| PAYMENT | SUCCESS | Success | No | Yes |
| PAYMENT | FAILED | Failed | No | Yes |
| PAYMENT | REFUNDED | Refunded | No | Yes |

**Important:** `is_terminal` indicates that the business workflow normally treats the status as closed. It does not by itself enforce workflow transitions. Valid status transitions should be enforced by the application/service layer or a dedicated workflow rule if strict database enforcement is required.

---

# 5. Vehicles

## 5.1 `vehicles`

A customer's registered vehicle.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Vehicle ID |
| customer_id | BIGINT UNSIGNED | FK → users.id, CASCADE | Owning customer |
| make | VARCHAR(50) | NOT NULL | e.g. Toyota |
| model | VARCHAR(50) | NOT NULL | e.g. Camry |
| year | SMALLINT | NOT NULL | Model year |
| vin | VARCHAR(17) | UNIQUE, NULL | Vehicle Identification Number, used with the vPIC API |
| license_plate | VARCHAR(15) | NULL | Plate number |
| created_at | DATETIME | DEFAULT NOW | Record creation timestamp |
| updated_at | DATETIME | AUTO-UPDATED | Last update timestamp |

---

# 6. Appointments & Check-In

## 6.1 `appointments`

A scheduled visit tied to a service request.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Appointment ID |
| service_request_id | BIGINT UNSIGNED | FK → service_requests.id, CASCADE | Related request |
| technician_id | BIGINT UNSIGNED | FK → users.id, SET NULL | Assigned technician; nullable until assigned |
| scheduled_date | DATETIME | NOT NULL | Appointment date/time |
| status_id | SMALLINT UNSIGNED | FK → statuses.id, RESTRICT | Current appointment status |
| created_at | DATETIME | DEFAULT NOW | Record creation timestamp |
| updated_at | DATETIME | AUTO-UPDATED | Last update timestamp |

**Status scope:** `table_code = APPOINTMENT`

## 6.2 `check_ins`

Vehicle drop-off confirmation for an appointment.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Check-in ID |
| appointment_id | BIGINT UNSIGNED | FK → appointments.id, CASCADE, UNIQUE | One check-in per appointment |
| arrival_confirmed | BOOLEAN | DEFAULT FALSE | Vehicle physically arrived |
| checkin_notes | TEXT | NULL | Notes recorded at drop-off |
| status_id | SMALLINT UNSIGNED | FK → statuses.id, RESTRICT | Current check-in status |
| checked_in_at | DATETIME | NULL | Timestamp of confirmed arrival |

**Status scope:** `table_code = CHECK_IN`

---

# 7. Work Orders, Repairs, Parts & Time Tracking

## 7.1 `work_orders`

The technician's active repair record for a service request.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Work order ID |
| service_request_id | BIGINT UNSIGNED | FK → service_requests.id, CASCADE, UNIQUE | One work order per request |
| technician_id | BIGINT UNSIGNED | FK → users.id, RESTRICT | Technician responsible |
| diagnosis | TEXT | NULL | Technician's diagnosis notes |
| status_id | SMALLINT UNSIGNED | FK → statuses.id, RESTRICT | Current work-order status |
| created_at | DATETIME | DEFAULT NOW | When work started |
| completed_at | DATETIME | NULL | When work finished |

**Status scope:** `table_code = WORK_ORDER`

## 7.2 `recommended_repairs`

Individual repair line items proposed to the customer for approval.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Repair line ID |
| work_order_id | BIGINT UNSIGNED | FK → work_orders.id, CASCADE | Parent work order |
| description | TEXT | NOT NULL | What needs repair |
| estimated_cost | DECIMAL(10,2) | DEFAULT 0.00 | Quoted price |
| status_id | SMALLINT UNSIGNED | FK → statuses.id, RESTRICT | Approval status |
| created_at | DATETIME | DEFAULT NOW | When proposed |
| decided_at | DATETIME | NULL | When customer approved/rejected |

**Status scope:** `table_code = RECOMMENDED_REPAIR`

The previous `approval_status ENUM` column is replaced by `status_id`.

## 7.3 `parts`

Inventory catalog.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Part ID |
| name | VARCHAR(100) | NOT NULL | Part name |
| sku | VARCHAR(50) | NOT NULL, UNIQUE | Stock keeping unit |
| stock_quantity | INT | DEFAULT 0 | Current stock on hand |
| reorder_level | INT | DEFAULT 5 | Triggers a low-stock alert below this |
| unit_price | DECIMAL(10,2) | DEFAULT 0.00 | Price per unit |
| created_at | DATETIME | DEFAULT NOW | Creation timestamp |
| updated_at | DATETIME | AUTO-UPDATED | Last update timestamp |

## 7.4 `part_usages`

Records which parts were used on which work order.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Usage record ID |
| work_order_id | BIGINT UNSIGNED | FK → work_orders.id, CASCADE | Related work order |
| part_id | BIGINT UNSIGNED | FK → parts.id, RESTRICT | Part used |
| quantity | INT | DEFAULT 1 | Quantity used |
| recorded_at | DATETIME | DEFAULT NOW | When usage was logged |

## 7.5 `time_logs`

Technician labor time tracking.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Time log ID |
| work_order_id | BIGINT UNSIGNED | FK → work_orders.id, CASCADE | Related work order |
| technician_id | BIGINT UNSIGNED | FK → users.id, RESTRICT | Technician logging time |
| start_time | DATETIME | NOT NULL | Timer start |
| end_time | DATETIME | NULL | Timer stop; null while running |
| duration_minutes | INT | GENERATED (computed) | Auto-calculated from start/end time |
| is_manual_entry | BOOLEAN | DEFAULT FALSE | True if manually typed instead of timed |

---

# 8. Billing

## 8.1 `invoices`

One invoice per completed work order.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Invoice ID |
| work_order_id | BIGINT UNSIGNED | FK → work_orders.id, CASCADE, UNIQUE | Source work order |
| amount | DECIMAL(10,2) | NOT NULL | Total amount due |
| status_id | SMALLINT UNSIGNED | FK → statuses.id, RESTRICT | Current invoice status |
| created_at | DATETIME | DEFAULT NOW | Record creation timestamp |
| updated_at | DATETIME | AUTO-UPDATED | Last update timestamp |

**Status scope:** `table_code = INVOICE`

## 8.2 `payments`

Payment transactions against an invoice; supports partial/multiple payments.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Payment ID |
| invoice_id | BIGINT UNSIGNED | FK → invoices.id, CASCADE | Related invoice |
| amount | DECIMAL(10,2) | NOT NULL | Amount paid in this transaction |
| method | ENUM | DEFAULT 'CARD' | CARD, BANK_TRANSFER, WALLET, OTHER |
| transaction_id | VARCHAR(100) | NULL | ID returned by the Payment Gateway |
| status_id | SMALLINT UNSIGNED | FK → statuses.id, RESTRICT | Current payment status |
| paid_at | DATETIME | NULL | When payment succeeded |
| created_at | DATETIME | DEFAULT NOW | When payment was initiated |

**Status scope:** `table_code = PAYMENT`

`method` remains an ENUM because payment method is separate from workflow status and is not part of the requested centralized status management.

---

# 9. Notifications

## 9.1 `notifications`

In-app notification feed for any user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Notification ID |
| user_id | BIGINT UNSIGNED | FK → users.id, CASCADE | Recipient |
| message | VARCHAR(500) | NOT NULL | Notification text |
| type | ENUM | DEFAULT 'SYSTEM' | SERVICE_REQUEST, APPOINTMENT, APPROVAL, BILLING, SYSTEM |
| is_read | BOOLEAN | DEFAULT FALSE | Read/unread state |
| created_at | DATETIME | DEFAULT NOW | When sent |

---

# 10. Table Relationship Summary

| Parent Table | Child Table | Relationship | On Delete |
|---|---|---|---|
| users | user_roles | 1 : many | CASCADE |
| roles | user_roles | 1 : many | RESTRICT |
| users | vehicles | 1 : many | CASCADE |
| service_types | service_requests | 1 : many | RESTRICT |
| statuses | service_requests | 1 : many | RESTRICT |
| users | service_requests | 1 : many | CASCADE |
| vehicles | service_requests | 1 : many | CASCADE |
| service_requests | appointments | 1 : many | CASCADE |
| statuses | appointments | 1 : many | RESTRICT |
| users (technician) | appointments | 1 : many | SET NULL |
| appointments | check_ins | 1 : 1 | CASCADE |
| statuses | check_ins | 1 : many | RESTRICT |
| service_requests | work_orders | 1 : 1 | CASCADE |
| statuses | work_orders | 1 : many | RESTRICT |
| users (technician) | work_orders | 1 : many | RESTRICT |
| work_orders | recommended_repairs | 1 : many | CASCADE |
| statuses | recommended_repairs | 1 : many | RESTRICT |
| work_orders | part_usages | 1 : many | CASCADE |
| parts | part_usages | 1 : many | RESTRICT |
| work_orders | time_logs | 1 : many | CASCADE |
| users (technician) | time_logs | 1 : many | RESTRICT |
| work_orders | invoices | 1 : 1 | CASCADE |
| statuses | invoices | 1 : many | RESTRICT |
| invoices | payments | 1 : many | CASCADE |
| statuses | payments | 1 : many | RESTRICT |
| users | notifications | 1 : many | CASCADE |

---

# 11. Code & Unique Field Standards

## 11.1 Why both `id` and `code` are used

The database uses numeric IDs for relational integrity and short codes for business meaning.

### Example

`roles`:

```text
id = 2
code = TECHNICIAN
name = Technician
```

Application code should generally refer to the stable code when expressing business rules:

```text
role.code = 'TECHNICIAN'
```

Foreign keys should continue to use the numeric ID:

```text
user_roles.role_id → roles.id
```

This separates internal database identity from business-readable identifiers.

## 11.2 Code requirements

Codes should:

- be unique within their defined scope;
- be uppercase;
- use letters, numbers, and underscores;
- remain stable after creation;
- not contain display text;
- not be reused for a different business meaning.

### Examples

```text
CUSTOMER
TECHNICIAN
ADMIN

OIL_CHANGE
BRAKE_REPAIR

SERVICE_REQUEST / SUBMITTED
APPOINTMENT / CONFIRMED
WORK_ORDER / IN_PROGRESS
INVOICE / PAID
PAYMENT / SUCCESS
```

## 11.3 Unique constraints

| Table | Unique Field |
|---|---|
| users | `username` |
| users | `email` |
| roles | `code` |
| user_roles | `(user_id, role_id)` |
| service_types | `code` |
| statuses | `(table_code, code)` |
| vehicles | `vin` |
| parts | `sku` |
| appointments/check-ins | `check_ins.appointment_id` |
| service_requests/work_orders | `work_orders.service_request_id` |
| work_orders/invoices | `invoices.work_order_id` |

A nullable unique field such as `vehicles.vin` allows multiple NULL values in MySQL while still preventing duplicate actual VIN values.

---

# 12. Recommended Status Query Pattern

Because status IDs are internal numeric values, application code should not assume that a particular numeric `status_id` always represents a particular status.

Instead, status lookup should use the stable code and workflow scope.

### Example

```sql
SELECT id
FROM statuses
WHERE table_code = 'SERVICE_REQUEST'
  AND code = 'SUBMITTED'
  AND is_active = TRUE;
```

A service request can then store the returned `id` in `service_requests.status_id`.

### Displaying a service request status

```sql
SELECT
    sr.id,
    sr.description,
    st.code AS status_code,
    st.name AS status_name
FROM service_requests sr
JOIN statuses st
    ON st.id = sr.status_id
WHERE sr.id = ?;
```

The same pattern can be used for appointments, check-ins, work orders, repairs, invoices, and payments.

---

# 13. Recommended Service Type Query Pattern

Service selection should also use the stable service code rather than hard-coded numeric IDs.

### Find a service

```sql
SELECT id, code, name
FROM service_types
WHERE code = 'OIL_CHANGE'
  AND is_active = TRUE;
```

### Display the requested service

```sql
SELECT
    sr.id AS service_request_id,
    st.code AS service_code,
    st.name AS service_name
FROM service_requests sr
JOIN service_types st
    ON st.id = sr.service_type_id
WHERE sr.id = ?;
```

---

# 14. Design Notes

- **Multi-role support:** `user_roles` is a many-to-many junction rather than a single role column on `users`, so a person can hold Customer and Technician roles simultaneously.
- **Role codes:** `roles.code` provides a stable business identifier while `roles.id` remains the relational primary key.
- **Service master data:** `service_types` replaces free-text service names in `service_requests`, preventing spelling variations and making services centrally manageable.
- **Service codes:** `service_types.code` provides a stable identifier such as `OIL_CHANGE`, while the customer-facing `name` can change without changing application logic.
- **Centralized statuses:** `statuses` replaces workflow-specific status ENUMs with managed lookup data.
- **Scoped status codes:** `statuses.(table_code, code)` is unique so each workflow can define its own status vocabulary while still allowing common codes such as `CANCELLED`, `COMPLETED`, `PENDING`, or `APPROVED`.
- **Status IDs:** Transactional tables store `status_id`, not status text. This improves referential integrity and avoids duplicated strings.
- **Status metadata:** `is_initial`, `is_terminal`, `sort_order`, and `is_active` provide useful workflow metadata without forcing the application to hard-code every status definition.
- **Status transitions:** The centralized table defines available statuses, but it does not automatically define every allowed transition. Transition rules should be handled by the application/service layer unless a separate workflow-transition table is introduced.
- **Soft deactivation:** `users.is_active`, `roles.is_active`, `service_types.is_active`, and `statuses.is_active` allow records to be disabled without breaking historical foreign-key references.
- **Generated duration:** `duration_minutes` is a generated column, so the application does not have to calculate or maintain it manually.
- **Photo storage:** `service_requests.photo_urls` stores S3 URLs as a JSON array rather than binary image data, keeping the database lightweight.
- **Foreign-key protection:** Lookup records such as roles, services, and statuses use `RESTRICT` on delete so historical transactional records cannot accidentally lose their business meaning.
- **Stable business identifiers:** Numeric IDs may change between environments after seed/migration operations, while codes such as `TECHNICIAN`, `OIL_CHANGE`, and `SERVICE_REQUEST/SUBMITTED` remain stable.

---

# 15. Updated Table Count

The updated AutoServe database contains **17 tables**:

1. `users`
2. `roles`
3. `user_roles`
4. `vehicles`
5. `service_types`
6. `statuses`
7. `service_requests`
8. `appointments`
9. `check_ins`
10. `work_orders`
11. `recommended_repairs`
12. `parts`
13. `part_usages`
14. `time_logs`
15. `invoices`
16. `payments`
17. `notifications`

The two major additions are `service_types` and `statuses`. This changes the design from hard-coded service/status values to centrally managed master data, which is considerably easier to maintain as AutoServe grows.

*Companion document to the updated `AutoServe_Database_Schema.sql` and the ER Diagram in the System Design section.*

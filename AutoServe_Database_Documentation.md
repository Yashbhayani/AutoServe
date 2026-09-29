# AutoServe — Database Design Documentation

**Database Engine:** MySQL 8.x
**Character Set:** utf8mb4 / utf8mb4_unicode_ci
**Total Tables:** 15

This document describes every table in the AutoServe schema, matching `AutoServe_Database_Schema.sql`. It is meant to accompany the ER Diagram in the System Design section of the report.

---

## 1. Users, Roles & Access

### 1.1 `users`
Stores every person who can log in — customers, technicians, and admins share this one table; their role(s) come from `user_roles`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Unique user ID |
| username | VARCHAR(50) | NOT NULL, UNIQUE | Login name, used in `/u/{username}/...` routes |
| email | VARCHAR(120) | NOT NULL, UNIQUE | Email address (used for OTP/notifications) |
| phone | VARCHAR(20) | NULL | Mobile number (used for SMS OTP) |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password (never stored in plain text) |
| is_email_verified | BOOLEAN | DEFAULT FALSE | Set true after email OTP is confirmed |
| is_phone_verified | BOOLEAN | DEFAULT FALSE | Set true after SMS OTP is confirmed |
| is_active | BOOLEAN | DEFAULT TRUE | Used to deactivate accounts without deleting them |
| created_at | DATETIME | DEFAULT NOW | Account creation timestamp |
| updated_at | DATETIME | AUTO-UPDATED | Last profile update timestamp |

### 1.2 `roles`
Fixed lookup table of the three system roles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TINYINT UNSIGNED | PK, AUTO_INCREMENT | Role ID |
| name | VARCHAR(30) | NOT NULL, UNIQUE | `CUSTOMER`, `TECHNICIAN`, or `ADMIN` |

### 1.3 `user_roles`
Junction table — links users to one or more roles, supporting the multi-role requirement (e.g. a user who is both Customer and Technician).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Row ID |
| user_id | BIGINT UNSIGNED | FK → users.id, CASCADE | The user |
| role_id | TINYINT UNSIGNED | FK → roles.id, RESTRICT | The assigned role |
| assigned_at | DATETIME | DEFAULT NOW | When the role was granted |

**Unique constraint:** `(user_id, role_id)` — a user can't be assigned the same role twice.

---

## 2. Vehicles

### 2.1 `vehicles`
A customer's registered vehicle.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Vehicle ID |
| customer_id | BIGINT UNSIGNED | FK → users.id, CASCADE | Owning customer |
| make | VARCHAR(50) | NOT NULL | e.g. Toyota |
| model | VARCHAR(50) | NOT NULL | e.g. Camry |
| year | SMALLINT | NOT NULL | Model year |
| vin | VARCHAR(17) | UNIQUE, NULL | Vehicle Identification Number (used with the vPIC API) |
| license_plate | VARCHAR(15) | NULL | Plate number |
| created_at / updated_at | DATETIME | DEFAULT NOW / AUTO-UPDATED | Record timestamps |

---

## 3. Service Requests, Appointments & Check-In

### 3.1 `service_requests`
A customer's request for service — the starting point of the repair workflow.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Request ID |
| customer_id | BIGINT UNSIGNED | FK → users.id, CASCADE | Requesting customer |
| vehicle_id | BIGINT UNSIGNED | FK → vehicles.id, CASCADE | Vehicle needing service |
| service_type | VARCHAR(80) | NOT NULL | e.g. "Oil Change", "Brake Repair" |
| description | TEXT | NULL | Customer's description of the problem |
| photo_urls | TEXT | NULL | JSON array of S3 photo URLs |
| preferred_date | DATE | NULL | Customer's requested date |
| status | ENUM | DEFAULT 'SUBMITTED' | SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED |
| created_at / updated_at | DATETIME | DEFAULT NOW / AUTO-UPDATED | Record timestamps |

### 3.2 `appointments`
A scheduled visit tied to a service request.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Appointment ID |
| service_request_id | BIGINT UNSIGNED | FK → service_requests.id, CASCADE | Related request |
| technician_id | BIGINT UNSIGNED | FK → users.id, SET NULL | Assigned technician (nullable until assigned) |
| scheduled_date | DATETIME | NOT NULL | Appointment date/time |
| status | ENUM | DEFAULT 'SCHEDULED' | SCHEDULED, CONFIRMED, RESCHEDULED, CANCELLED, COMPLETED |
| created_at / updated_at | DATETIME | DEFAULT NOW / AUTO-UPDATED | Record timestamps |

### 3.3 `check_ins`
Vehicle drop-off confirmation for an appointment.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Check-in ID |
| appointment_id | BIGINT UNSIGNED | FK → appointments.id, CASCADE, UNIQUE | One check-in per appointment |
| arrival_confirmed | BOOLEAN | DEFAULT FALSE | Vehicle physically arrived |
| checkin_notes | TEXT | NULL | Any notes recorded at drop-off |
| status | ENUM | DEFAULT 'PENDING' | PENDING, ARRIVED, VERIFIED |
| checked_in_at | DATETIME | NULL | Timestamp of confirmed arrival |

---

## 4. Work Orders, Repairs, Parts & Time Tracking

### 4.1 `work_orders`
The technician's active repair record for a service request.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Work order ID |
| service_request_id | BIGINT UNSIGNED | FK → service_requests.id, CASCADE, UNIQUE | One work order per request |
| technician_id | BIGINT UNSIGNED | FK → users.id, RESTRICT | Technician responsible |
| diagnosis | TEXT | NULL | Technician's diagnosis notes |
| status | ENUM | DEFAULT 'OPEN' | OPEN, DIAGNOSING, AWAITING_APPROVAL, IN_PROGRESS, COMPLETED |
| created_at | DATETIME | DEFAULT NOW | When work started |
| completed_at | DATETIME | NULL | When work finished |

### 4.2 `recommended_repairs`
Individual repair line items proposed to the customer for approval.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Repair line ID |
| work_order_id | BIGINT UNSIGNED | FK → work_orders.id, CASCADE | Parent work order |
| description | TEXT | NOT NULL | What needs repair |
| estimated_cost | DECIMAL(10,2) | DEFAULT 0.00 | Quoted price |
| approval_status | ENUM | DEFAULT 'PENDING' | PENDING, APPROVED, REJECTED |
| created_at | DATETIME | DEFAULT NOW | When proposed |
| decided_at | DATETIME | NULL | When the customer approved/rejected |

### 4.3 `parts`
Inventory catalog.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Part ID |
| name | VARCHAR(100) | NOT NULL | Part name |
| sku | VARCHAR(50) | NOT NULL, UNIQUE | Stock keeping unit |
| stock_quantity | INT | DEFAULT 0 | Current stock on hand |
| reorder_level | INT | DEFAULT 5 | Triggers a low-stock alert below this |
| unit_price | DECIMAL(10,2) | DEFAULT 0.00 | Price per unit |
| created_at / updated_at | DATETIME | DEFAULT NOW / AUTO-UPDATED | Record timestamps |

### 4.4 `part_usages`
Records which parts were used on which work order.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Usage record ID |
| work_order_id | BIGINT UNSIGNED | FK → work_orders.id, CASCADE | Related work order |
| part_id | BIGINT UNSIGNED | FK → parts.id, RESTRICT | Part used |
| quantity | INT | DEFAULT 1 | Quantity used |
| recorded_at | DATETIME | DEFAULT NOW | When usage was logged |

### 4.5 `time_logs`
Technician labor time tracking.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Time log ID |
| work_order_id | BIGINT UNSIGNED | FK → work_orders.id, CASCADE | Related work order |
| technician_id | BIGINT UNSIGNED | FK → users.id, RESTRICT | Technician logging time |
| start_time | DATETIME | NOT NULL | Timer start |
| end_time | DATETIME | NULL | Timer stop (null while running) |
| duration_minutes | INT | GENERATED (computed) | Auto-calculated from start/end time |
| is_manual_entry | BOOLEAN | DEFAULT FALSE | True if manually typed instead of timed |

---

## 5. Billing

### 5.1 `invoices`
One invoice per completed work order.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Invoice ID |
| work_order_id | BIGINT UNSIGNED | FK → work_orders.id, CASCADE, UNIQUE | Source work order |
| amount | DECIMAL(10,2) | NOT NULL | Total amount due |
| status | ENUM | DEFAULT 'DRAFT' | DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID |
| created_at / updated_at | DATETIME | DEFAULT NOW / AUTO-UPDATED | Record timestamps |

### 5.2 `payments`
Payment transactions against an invoice (supports partial/multiple payments).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Payment ID |
| invoice_id | BIGINT UNSIGNED | FK → invoices.id, CASCADE | Related invoice |
| amount | DECIMAL(10,2) | NOT NULL | Amount paid in this transaction |
| method | ENUM | DEFAULT 'CARD' | CARD, BANK_TRANSFER, WALLET, OTHER |
| transaction_id | VARCHAR(100) | NULL | ID returned by the Payment Gateway |
| status | ENUM | DEFAULT 'PENDING' | PENDING, SUCCESS, FAILED, REFUNDED |
| paid_at | DATETIME | NULL | When payment succeeded |
| created_at | DATETIME | DEFAULT NOW | When payment was initiated |

---

## 6. Notifications

### 6.1 `notifications`
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

## Table Relationship Summary

| Parent Table | Child Table | Relationship | On Delete |
|---|---|---|---|
| users | user_roles | 1 : many | CASCADE |
| roles | user_roles | 1 : many | RESTRICT |
| users | vehicles | 1 : many | CASCADE |
| users | service_requests | 1 : many | CASCADE |
| vehicles | service_requests | 1 : many | CASCADE |
| service_requests | appointments | 1 : many | CASCADE |
| users (technician) | appointments | 1 : many | SET NULL |
| appointments | check_ins | 1 : 1 | CASCADE |
| service_requests | work_orders | 1 : 1 | CASCADE |
| users (technician) | work_orders | 1 : many | RESTRICT |
| work_orders | recommended_repairs | 1 : many | CASCADE |
| work_orders | part_usages | 1 : many | CASCADE |
| parts | part_usages | 1 : many | RESTRICT |
| work_orders | time_logs | 1 : many | CASCADE |
| users (technician) | time_logs | 1 : many | RESTRICT |
| work_orders | invoices | 1 : 1 | CASCADE |
| invoices | payments | 1 : many | CASCADE |
| users | notifications | 1 : many | CASCADE |

---

## Design Notes

- **Multi-role support**: `user_roles` is a many-to-many junction rather than a single `role` column on `users`, so a person can hold Customer and Technician roles simultaneously, per the requirement in the use case documents.
- **Status fields use `ENUM`** rather than free-text strings, so invalid states are rejected at the database level, not just in application code.
- **Soft deactivation over hard deletes**: `users.is_active` lets accounts be disabled without breaking foreign key history (work orders, invoices, etc. stay intact).
- **`duration_minutes` is a generated column** — MySQL computes and stores it automatically from `start_time`/`end_time`, so the application never has to calculate or keep it in sync manually.
- **Photo storage**: `service_requests.photo_urls` stores S3 URLs (JSON array) rather than binary image data, keeping the database lightweight — matches the S3 usage in the deployment diagram.

---
*Companion document to `AutoServe_Database_Schema.sql` and the ER Diagram in the System Design section.*

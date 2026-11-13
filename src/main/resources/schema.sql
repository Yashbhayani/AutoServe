-- Additive extension for durable technician requests. Existing project tables are unchanged.
CREATE TABLE IF NOT EXISTS dev_autoserve.part_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    work_order_id BIGINT UNSIGNED NOT NULL,
    technician_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    note VARCHAR(500) NOT NULL DEFAULT '',
    resolved_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    CONSTRAINT fk_pr_order FOREIGN KEY (work_order_id) REFERENCES dev_autoserve.work_orders(id),
    CONSTRAINT fk_pr_tech FOREIGN KEY (technician_id) REFERENCES dev_autoserve.users(id),
    CONSTRAINT fk_pr_part FOREIGN KEY (part_id) REFERENCES dev_autoserve.parts(id),
    CONSTRAINT fk_pr_resolver FOREIGN KEY (resolved_by) REFERENCES dev_autoserve.users(id),
    CONSTRAINT ck_pr_quantity CHECK (quantity > 0),
    CONSTRAINT ck_pr_status CHECK (status IN ('Pending', 'Issued', 'Rejected')),
    INDEX idx_pr_status (status, created_at),
    INDEX idx_pr_tech (technician_id, created_at)
);

-- Additive AutoServe workflow API. Does not replace existing business tables.

CREATE TABLE IF NOT EXISTS dev_autoserve.as_workflow (
 request_id BIGINT UNSIGNED PRIMARY KEY, stage VARCHAR(32) NOT NULL DEFAULT 'Service Requested',
 held TINYINT NOT NULL DEFAULT 0, hold_reason VARCHAR(500) NOT NULL DEFAULT '',
 FOREIGN KEY(request_id) REFERENCES dev_autoserve.service_requests(id),
 CHECK(stage IN ('Service Requested','Vehicle Checked In','Diagnosis','Customer Approval','Repair','Completed'))
);
CREATE TABLE IF NOT EXISTS dev_autoserve.as_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,request_id BIGINT UNSIGNED NOT NULL,actor_id BIGINT UNSIGNED NOT NULL,
 action VARCHAR(50) NOT NULL,stage VARCHAR(32),note VARCHAR(500) NOT NULL DEFAULT '',created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(request_id) REFERENCES dev_autoserve.service_requests(id),FOREIGN KEY(actor_id) REFERENCES dev_autoserve.users(id)
);
CREATE TABLE IF NOT EXISTS dev_autoserve.as_settings (
 id INT PRIMARY KEY,center_name VARCHAR(100) NOT NULL,phone VARCHAR(20) NOT NULL,email VARCHAR(120) NOT NULL,address VARCHAR(255) NOT NULL
);
INSERT IGNORE INTO dev_autoserve.as_settings VALUES(1,'AutoServe','','','');
CREATE TABLE IF NOT EXISTS dev_autoserve.as_technicians (
 user_id BIGINT UNSIGNED PRIMARY KEY,specialties VARCHAR(500) NOT NULL DEFAULT '',availability VARCHAR(20) NOT NULL DEFAULT 'Available',
 FOREIGN KEY(user_id) REFERENCES dev_autoserve.users(id),CHECK(availability IN ('Available','Busy','Off'))
);
INSERT IGNORE INTO dev_autoserve.statuses(table_code,code,name,sort_order,is_initial,is_terminal,is_active) VALUES('CHECK_IN','ARRIVED','Arrived',1,1,1,1);
INSERT IGNORE INTO dev_autoserve.as_workflow(request_id,stage)
 SELECT sr.id,CASE WHEN s.code='COMPLETED' OR ws.code='COMPLETED' THEN 'Completed'
 WHEN ws.code='IN_PROGRESS' OR s.code='IN_PROGRESS' THEN 'Repair'
 WHEN ws.code='AWAITING_APPROVAL' THEN 'Customer Approval' WHEN ws.code='DIAGNOSING' THEN 'Diagnosis'
 WHEN EXISTS(SELECT 1 FROM dev_autoserve.appointments a JOIN dev_autoserve.check_ins ci ON ci.appointment_id=a.id WHERE a.service_request_id=sr.id AND ci.arrival_confirmed=1) THEN 'Vehicle Checked In'
 ELSE 'Service Requested' END
 FROM dev_autoserve.service_requests sr JOIN dev_autoserve.statuses s ON s.id=sr.status_id LEFT JOIN dev_autoserve.work_orders w ON w.service_request_id=sr.id LEFT JOIN dev_autoserve.statuses ws ON ws.id=w.status_id;
CREATE TABLE IF NOT EXISTS dev_autoserve.as_auth_epoch (
 user_id BIGINT UNSIGNED PRIMARY KEY,version VARCHAR(36) NOT NULL,FOREIGN KEY(user_id) REFERENCES dev_autoserve.users(id)
);

-- Parts prices and approval revisions are independent of mutable catalogue prices.
CREATE TABLE IF NOT EXISTS dev_autoserve.as_order_billing (
 work_order_id BIGINT UNSIGNED PRIMARY KEY,
 revision INT NOT NULL DEFAULT 0,
 approved_revision INT NULL,
 FOREIGN KEY(work_order_id) REFERENCES dev_autoserve.work_orders(id)
);
CREATE TABLE IF NOT EXISTS dev_autoserve.as_part_quotes (
 work_order_id BIGINT UNSIGNED NOT NULL, part_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(100) NOT NULL, sku VARCHAR(50) NOT NULL,
 quantity INT NOT NULL, unit_price DECIMAL(10,2) NOT NULL,
 PRIMARY KEY(work_order_id,part_id),
 FOREIGN KEY(work_order_id) REFERENCES dev_autoserve.work_orders(id),
 FOREIGN KEY(part_id) REFERENCES dev_autoserve.parts(id),
 CHECK(quantity>0),CHECK(unit_price>=0)
);
CREATE TABLE IF NOT EXISTS dev_autoserve.as_invoice_details (
 invoice_id BIGINT UNSIGNED PRIMARY KEY,
 parts_total DECIMAL(10,2) NOT NULL, labor_total DECIMAL(10,2) NOT NULL,
 labor_description VARCHAR(500) NOT NULL,
 customer_name VARCHAR(255) NOT NULL, vehicle VARCHAR(255) NOT NULL,
 center_name VARCHAR(100) NOT NULL, center_address VARCHAR(255) NOT NULL,
 center_phone VARCHAR(20) NOT NULL, center_email VARCHAR(120) NOT NULL,
 FOREIGN KEY(invoice_id) REFERENCES dev_autoserve.invoices(id)
);
CREATE TABLE IF NOT EXISTS dev_autoserve.as_invoice_lines (
 invoice_id BIGINT UNSIGNED NOT NULL,part_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(100) NOT NULL,sku VARCHAR(50) NOT NULL,quantity INT NOT NULL,
 unit_price DECIMAL(10,2) NOT NULL,
 PRIMARY KEY(invoice_id,part_id),
 FOREIGN KEY(invoice_id) REFERENCES dev_autoserve.invoices(id)
);

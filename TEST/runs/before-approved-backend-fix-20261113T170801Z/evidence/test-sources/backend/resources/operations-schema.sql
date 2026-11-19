CREATE SCHEMA dev_autoserve;
SET SCHEMA dev_autoserve;
CREATE TABLE `SpTable` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `Code` varchar(50)  NOT NULL,
  `Name` varchar(255)  NOT NULL,
  `Description` varchar(255)  DEFAULT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `uq_sptable_code` (`Code`)
);
CREATE TABLE `part_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50)  NOT NULL,
  `name` varchar(100)  NOT NULL,
  `description` varchar(255)  DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_part_categories_code` (`code`),
  UNIQUE KEY `uq_part_categories_name` (`name`)
);
CREATE TABLE `parts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50)  NOT NULL,
  `name` varchar(100)  NOT NULL,
  `sku` varchar(50)  NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `category_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_parts_sku` (`sku`),
  UNIQUE KEY `uq_parts_code` (`code`),
  KEY `fk_parts_category` (`category_id`),
  CONSTRAINT `fk_parts_category` FOREIGN KEY (`category_id`) REFERENCES `part_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE `permissions` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(80)  NOT NULL,
  `description` varchar(255)  DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_code` (`code`)
);
CREATE TABLE `roles` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(30)  NOT NULL,
  `name` varchar(50)  NOT NULL,
  `description` varchar(255)  DEFAULT NULL,
  `is_active` tinyint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_code` (`code`)
);
CREATE TABLE `service_types` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50)  NOT NULL,
  `name` varchar(100)  NOT NULL,
  `description` varchar(500)  DEFAULT NULL,
  `is_active` tinyint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_types_code` (`code`)
);
CREATE TABLE `statuses` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `table_code` varchar(50)  NOT NULL,
  `code` varchar(50)  NOT NULL,
  `name` varchar(100)  NOT NULL,
  `description` varchar(255)  DEFAULT NULL,
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `is_initial` tinyint NOT NULL,
  `is_terminal` tinyint NOT NULL,
  `is_active` tinyint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_statuses_table_code` (`table_code`,`code`)
);
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50)  NOT NULL,
  `email` varchar(120)  NOT NULL,
  `first_name` varchar(50)  NOT NULL,
  `last_name` varchar(50)  NOT NULL,
  `phone` varchar(20)  DEFAULT NULL,
  `driving_license_number` varchar(50)  DEFAULT NULL,
  `password_hash` varchar(255)  NOT NULL,
  `is_email_verified` tinyint NOT NULL,
  `is_phone_verified` tinyint NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
);
CREATE TABLE `vehicles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `make` varchar(50)  NOT NULL,
  `color` varchar(50)  NOT NULL,
  `model` varchar(50)  NOT NULL,
  `year` smallint NOT NULL,
  `vin` varchar(17)  DEFAULT NULL,
  `mileage` varchar(50)  NOT NULL,
  `license_plate` varchar(15)  DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vehicles_vin` (`vin`),
  KEY `idx_vehicles_customer` (`customer_id`),
  CONSTRAINT `fk_vehicles_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `message` varchar(500)  NOT NULL,
  `type` enum('APPOINTMENT','APPROVAL','BILLING','SERVICE_REQUEST','SYSTEM')  NOT NULL,
  `is_read` tinyint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read` (`user_id`,`is_read`,`created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE `part_inventory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `part_id` bigint unsigned NOT NULL,
  `stock_quantity` int NOT NULL DEFAULT '0',
  `reorder_level` int NOT NULL DEFAULT '5',
  `is_active` tinyint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_part_inventory_part` (`part_id`),
  CONSTRAINT `fk_part_inventory_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_part_inventory_reorder` CHECK ((`reorder_level` >= 0)),
  CONSTRAINT `chk_part_inventory_stock` CHECK ((`stock_quantity` >= 0))
);
CREATE TABLE `part_prices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `part_id` bigint unsigned NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `effective_from` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `effective_to` datetime DEFAULT NULL,
  `current_flag` tinyint GENERATED ALWAYS AS (CASE WHEN `effective_to` IS NULL THEN 1 ELSE NULL END),
  `is_active` tinyint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_part_prices_period` (`part_id`,`effective_from`),
  UNIQUE KEY `uq_part_prices_current` (`part_id`,`current_flag`),
  CONSTRAINT `fk_part_prices_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_part_prices_period` CHECK (((`effective_to` is null) or (`effective_to` > `effective_from`))),
  CONSTRAINT `chk_part_prices_price` CHECK ((`unit_price` >= 0))
);
CREATE TABLE `refresh_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revoked_at` datetime(3) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_refresh_tokens_user` (`user_id`),
  KEY `idx_refresh_tokens_expiry` (`expires_at`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
CREATE TABLE `role_permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_id` tinyint unsigned NOT NULL,
  `permission_id` smallint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_permission` (`role_id`,`permission_id`),
  KEY `fk_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE `service_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `vehicle_id` bigint unsigned NOT NULL,
  `description` text ,
  `photo_urls` text  COMMENT 'JSON array of S3 photo URLs',
  `preferred_date` datetime DEFAULT NULL,
  `status_id` smallint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `preferred_time` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sr_customer_status` (`customer_id`,`status_id`),
  KEY `idx_sr_vehicle` (`vehicle_id`),
  KEY `idx_sr_status` (`status_id`),
  CONSTRAINT `fk_sr_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sr_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sr_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_sr_photo_urls` CHECK (((`photo_urls` is null) or (`photo_urls` IS JSON)))
);
CREATE TABLE `user_roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `role_id` tinyint unsigned NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_roles_user_role` (`user_id`,`role_id`),
  KEY `idx_user_roles_role` (`role_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE `work_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `service_request_id` bigint unsigned NOT NULL,
  `technician_id` bigint unsigned NOT NULL,
  `diagnosis` text ,
  `status_id` smallint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wo_request` (`service_request_id`),
  KEY `idx_wo_technician` (`technician_id`),
  KEY `idx_wo_status` (`status_id`),
  CONSTRAINT `fk_wo_request` FOREIGN KEY (`service_request_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wo_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_wo_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE `appointments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `service_request_id` bigint unsigned NOT NULL,
  `technician_id` bigint unsigned DEFAULT NULL,
  `scheduled_date` datetime NOT NULL,
  `status_id` smallint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_appointed` tinyint(1) NOT NULL DEFAULT '0',
  `scheduled_time` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_appt_request` (`service_request_id`),
  KEY `idx_appt_tech_date` (`technician_id`,`scheduled_date`),
  KEY `idx_appt_status` (`status_id`),
  CONSTRAINT `fk_appt_request` FOREIGN KEY (`service_request_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_appt_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_appt_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE `check_ins` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `appointment_id` bigint unsigned NOT NULL,
  `arrival_confirmed` tinyint NOT NULL,
  `checkin_notes` text ,
  `status_id` smallint unsigned NOT NULL,
  `checked_in_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_checkins_appointment` (`appointment_id`),
  KEY `idx_checkins_status` (`status_id`),
  CONSTRAINT `fk_checkins_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_checkins_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE `invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` bigint unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status_id` smallint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoices_work_order` (`work_order_id`),
  KEY `idx_invoices_status` (`status_id`),
  CONSTRAINT `fk_invoices_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_invoices_amount` CHECK ((`amount` >= 0))
);
CREATE TABLE `part_usages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` bigint unsigned NOT NULL,
  `part_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `recorded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pu_work_order` (`work_order_id`),
  KEY `idx_pu_part` (`part_id`),
  CONSTRAINT `fk_pu_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pu_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_pu_quantity` CHECK ((`quantity` > 0))
);
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('BANK_TRANSFER','CARD','OTHER','WALLET')  NOT NULL,
  `transaction_id` varchar(100)  DEFAULT NULL,
  `status_id` smallint unsigned NOT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payments_invoice` (`invoice_id`),
  KEY `idx_payments_status` (`status_id`),
  KEY `idx_payments_transaction` (`transaction_id`),
  CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_payments_amount` CHECK ((`amount` > 0))
);
CREATE TABLE `recommended_repairs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` bigint unsigned NOT NULL,
  `description` text  NOT NULL,
  `estimated_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status_id` smallint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rr_work_order` (`work_order_id`),
  KEY `idx_rr_status` (`status_id`),
  CONSTRAINT `fk_rr_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_rr_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_rr_cost` CHECK ((`estimated_cost` >= 0))
);
CREATE TABLE `service_request_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `service_request_id` bigint unsigned NOT NULL,
  `service_type_id` smallint unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_request_service` (`service_request_id`,`service_type_id`),
  KEY `idx_srs_service_type` (`service_type_id`),
  CONSTRAINT `fk_srs_service_request` FOREIGN KEY (`service_request_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_srs_service_type` FOREIGN KEY (`service_type_id`) REFERENCES `service_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE `time_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` bigint unsigned NOT NULL,
  `technician_id` bigint unsigned NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration_minutes` int GENERATED ALWAYS AS (timestampdiff(MINUTE,`start_time`,`end_time`)),
  `is_manual_entry` tinyint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tl_work_order` (`work_order_id`),
  KEY `idx_tl_technician` (`technician_id`),
  CONSTRAINT `fk_tl_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_tl_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_tl_times` CHECK (((`end_time` is null) or (`end_time` >= `start_time`)))
);
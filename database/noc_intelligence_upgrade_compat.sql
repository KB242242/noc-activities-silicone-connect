-- NOC schema upgrade (compatible with MySQL/MariaDB versions without ADD COLUMN IF NOT EXISTS)

-- ------------------------------
-- noc_clients missing columns
-- ------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_clients'
    AND COLUMN_NAME = 'service_type'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_clients ADD COLUMN service_type ENUM('INTERNET','INTERCO','INTERNET_INTERCO','LIAISON') NOT NULL DEFAULT 'INTERNET' AFTER sla_target_percent",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_clients'
    AND COLUMN_NAME = 'bandwidth_mbps'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_clients ADD COLUMN bandwidth_mbps DECIMAL(12,2) NULL AFTER service_type",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_clients'
    AND COLUMN_NAME = 'notes'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_clients ADD COLUMN notes TEXT NULL AFTER bandwidth_mbps",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------
-- noc_equipements missing columns
-- ------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_equipements'
    AND COLUMN_NAME = 'latitude'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_equipements ADD COLUMN latitude DECIMAL(10,7) NULL AFTER zabbix_hostid",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_equipements'
    AND COLUMN_NAME = 'longitude'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_equipements ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_equipements'
    AND COLUMN_NAME = 'install_date'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_equipements ADD COLUMN install_date DATE NULL AFTER longitude",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_equipements'
    AND COLUMN_NAME = 'replace_due_date'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_equipements ADD COLUMN replace_due_date DATE NULL AFTER install_date",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_equipements'
    AND COLUMN_NAME = 'estimated_service_life_months'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_equipements ADD COLUMN estimated_service_life_months INT NULL AFTER replace_due_date",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure equipment enum accepts new values used by UI/API.
ALTER TABLE noc_equipements
  MODIFY COLUMN equipement_type ENUM('SWITCH','ROUTER','PC','FIREWALL','SERVER','OTHER','ONT','ONU','OLT','RADIO') NOT NULL;

-- ------------------------------
-- noc_cables missing columns
-- ------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_cables'
    AND COLUMN_NAME = 'dimension'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_cables ADD COLUMN dimension VARCHAR(100) NULL AFTER cable_type",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure cable enum accepts new values used by UI/API.
ALTER TABLE noc_cables
  MODIFY COLUMN cable_type ENUM('FIBER','COPPER','COAX','FIBER_OPTIC','COAXIAL','JARETIERE','OTHER') NOT NULL DEFAULT 'FIBER_OPTIC';

-- ------------------------------
-- noc_client_liaisons expected columns
-- ------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_client_liaisons'
    AND COLUMN_NAME = 'service_type'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_client_liaisons ADD COLUMN service_type ENUM('INTERNET','INTERCO','INTERNET_INTERCO','LIAISON') NOT NULL DEFAULT 'INTERNET' AFTER bandwidth_mbps",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------
-- Advanced client metadata
-- ------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_clients'
    AND COLUMN_NAME = 'logo_url'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_clients ADD COLUMN logo_url VARCHAR(500) NULL AFTER client_name",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_clients'
    AND COLUMN_NAME = 'client_type'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_clients ADD COLUMN client_type VARCHAR(120) NULL AFTER service_type",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_clients'
    AND COLUMN_NAME = 'country'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_clients ADD COLUMN country VARCHAR(120) NULL AFTER client_type",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_clients'
    AND COLUMN_NAME = 'locality'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_clients ADD COLUMN locality VARCHAR(191) NULL AFTER country",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_clients'
    AND COLUMN_NAME = 'satisfaction_score'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_clients ADD COLUMN satisfaction_score DECIMAL(4,2) NULL AFTER notes",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_clients'
    AND COLUMN_NAME = 'satisfaction_comment'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_clients ADD COLUMN satisfaction_comment TEXT NULL AFTER satisfaction_score",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_clients'
    AND COLUMN_NAME = 'archived_at'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_clients ADD COLUMN archived_at TIMESTAMP NULL AFTER updated_at",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_equipements'
    AND COLUMN_NAME = 'image_url'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_equipements ADD COLUMN image_url VARCHAR(500) NULL AFTER model",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_client_liaisons'
    AND COLUMN_NAME = 'from_port'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_client_liaisons ADD COLUMN from_port VARCHAR(120) NULL AFTER liaison_label",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_client_liaisons'
    AND COLUMN_NAME = 'to_port'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_client_liaisons ADD COLUMN to_port VARCHAR(120) NULL AFTER from_port",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------
-- Client history + interventions
-- ------------------------------
CREATE TABLE IF NOT EXISTS noc_client_history (
  id_history BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  actor_id VARCHAR(191) NULL,
  actor_name VARCHAR(191) NULL,
  action_type ENUM('CREATE','UPDATE','DELETE','ARCHIVE','UNARCHIVE','PORT_CHANGE','REPORT_EXPORT') NOT NULL,
  action_label VARCHAR(255) NOT NULL,
  details_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_history),
  KEY idx_noc_client_history_client (client_id),
  KEY idx_noc_client_history_created (created_at),
  CONSTRAINT fk_noc_client_history_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_interventions (
  id_intervention BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  intervention_type VARCHAR(120) NULL,
  status ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  technician_name VARCHAR(191) NULL,
  ticket_ref VARCHAR(120) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_intervention),
  KEY idx_noc_client_intervention_client (client_id),
  KEY idx_noc_client_intervention_status (status),
  CONSTRAINT fk_noc_client_intervention_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'noc_client_liaisons'
    AND COLUMN_NAME = 'notes'
);
SET @sql := IF(@exists = 0,
  "ALTER TABLE noc_client_liaisons ADD COLUMN notes TEXT NULL AFTER status",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

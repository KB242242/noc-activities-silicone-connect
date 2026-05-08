-- ============================================================
-- Migration : noc_callcenter (configuration + appels)
-- ============================================================

CREATE TABLE IF NOT EXISTS noc_callcenter_settings (
  id TINYINT UNSIGNED NOT NULL,
  line1 VARCHAR(50) NOT NULL DEFAULT '+242053895704',
  line2 VARCHAR(50) NOT NULL DEFAULT '+242067236935',
  provider ENUM('NONE','TWILIO','ASTERISK','3CX') NOT NULL DEFAULT 'NONE',
  webhook_url VARCHAR(500) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO noc_callcenter_settings (id, line1, line2, provider)
VALUES (1, '+242053895704', '+242067236935', 'NONE')
ON DUPLICATE KEY UPDATE id = VALUES(id);

CREATE TABLE IF NOT EXISTS noc_callcenter_calls (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_name VARCHAR(200) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  line_number VARCHAR(50) NOT NULL,
  direction ENUM('INCOMING','OUTGOING') NOT NULL,
  priority ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('RINGING','IN_PROGRESS','MISSED','DONE') NOT NULL DEFAULT 'RINGING',
  reason TEXT NULL,
  external_call_id VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_callcenter_status (status),
  KEY idx_callcenter_priority (priority),
  KEY idx_callcenter_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

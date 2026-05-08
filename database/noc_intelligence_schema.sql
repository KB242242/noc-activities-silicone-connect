-- NOC Intelligent schema extension
-- MySQL 8+

CREATE TABLE IF NOT EXISTS mapping_zabbix (
  id_mapping BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_client VARCHAR(191) NOT NULL,
  hostid_zabbix VARCHAR(64) NOT NULL,
  ip_client VARCHAR(64) NOT NULL,
  nom_host VARCHAR(255) NOT NULL,
  sync_status ENUM('SYNCED', 'PENDING', 'ERROR') NOT NULL DEFAULT 'SYNCED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_mapping),
  UNIQUE KEY uk_mapping_zabbix_client (id_client),
  UNIQUE KEY uk_mapping_zabbix_host (hostid_zabbix),
  UNIQUE KEY uk_mapping_zabbix_ip (ip_client),
  KEY idx_mapping_zabbix_host_name (nom_host),
  CONSTRAINT fk_mapping_zabbix_users FOREIGN KEY (id_client) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_infrastructure_node (
  id_node BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  node_code VARCHAR(50) NOT NULL,
  node_type ENUM('BACKBONE', 'CHAMBRE', 'PBO', 'POP', 'TRANSIT') NOT NULL,
  label VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  status ENUM('UP', 'DOWN', 'DEGRADED', 'MAINTENANCE') NOT NULL DEFAULT 'UP',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_node),
  UNIQUE KEY uk_noc_node_code (node_code),
  KEY idx_noc_node_type_status (node_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_fiber_link (
  id_link BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  from_node_id BIGINT UNSIGNED NOT NULL,
  to_node_id BIGINT UNSIGNED NOT NULL,
  link_name VARCHAR(255) NOT NULL,
  capacity_mbps BIGINT UNSIGNED NOT NULL,
  utilization_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  status ENUM('UP', 'DOWN', 'DEGRADED', 'MAINTENANCE') NOT NULL DEFAULT 'UP',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_link),
  KEY idx_noc_fiber_status (status),
  KEY idx_noc_fiber_from_to (from_node_id, to_node_id),
  CONSTRAINT fk_noc_fiber_from_node FOREIGN KEY (from_node_id) REFERENCES noc_infrastructure_node(id_node)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_noc_fiber_to_node FOREIGN KEY (to_node_id) REFERENCES noc_infrastructure_node(id_node)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_incident (
  id_incident BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  severity ENUM('P1', 'P2', 'P3', 'P4') NOT NULL,
  source ENUM('ZABBIX', 'LIBRENMS', 'PROMETHEUS', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
  root_cause_hint VARCHAR(255) NULL,
  status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  detected_at DATETIME NOT NULL,
  resolved_at DATETIME NULL,
  created_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_incident),
  KEY idx_noc_incident_status_severity (status, severity),
  KEY idx_noc_incident_detected (detected_at),
  CONSTRAINT fk_noc_incident_user FOREIGN KEY (created_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_incident_client (
  id_incident BIGINT UNSIGNED NOT NULL,
  id_mapping BIGINT UNSIGNED NOT NULL,
  impact_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  PRIMARY KEY (id_incident, id_mapping),
  CONSTRAINT fk_noc_incident_client_incident FOREIGN KEY (id_incident) REFERENCES noc_incident(id_incident)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_noc_incident_client_mapping FOREIGN KEY (id_mapping) REFERENCES mapping_zabbix(id_mapping)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_metric_snapshot (
  id_snapshot BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_mapping BIGINT UNSIGNED NOT NULL,
  rx_dbm DECIMAL(8, 3) NULL,
  tx_dbm DECIMAL(8, 3) NULL,
  traffic_in_mbps DECIMAL(12, 3) NULL,
  traffic_out_mbps DECIMAL(12, 3) NULL,
  latency_ms DECIMAL(10, 3) NULL,
  packet_loss_percent DECIMAL(7, 4) NULL,
  uptime_seconds BIGINT UNSIGNED NULL,
  captured_at DATETIME NOT NULL,
  PRIMARY KEY (id_snapshot),
  KEY idx_noc_metric_mapping_time (id_mapping, captured_at),
  CONSTRAINT fk_noc_metric_mapping FOREIGN KEY (id_mapping) REFERENCES mapping_zabbix(id_mapping)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW noc_client_availability_monthly AS
SELECT
  mz.id_client,
  DATE_FORMAT(ms.captured_at, '%Y-%m') AS month_key,
  ROUND(
    100 * SUM(CASE WHEN COALESCE(ms.packet_loss_percent, 0) < 5 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
    2
  ) AS availability_percent,
  COUNT(*) AS samples_count
FROM mapping_zabbix mz
JOIN noc_metric_snapshot ms ON ms.id_mapping = mz.id_mapping
GROUP BY mz.id_client, DATE_FORMAT(ms.captured_at, '%Y-%m');

CREATE TABLE IF NOT EXISTS noc_clients (
  id_client BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_ref VARCHAR(80) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NULL,
  contact_email VARCHAR(191) NULL,
  address TEXT NULL,
  ip_client VARCHAR(64) NULL,
  hostid_zabbix VARCHAR(64) NULL,
  sla_target_percent DECIMAL(5, 2) NOT NULL DEFAULT 99.90,
  status ENUM('ACTIVE', 'SUSPENDED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_client),
  UNIQUE KEY uk_noc_clients_ref (client_ref),
  UNIQUE KEY uk_noc_clients_ip (ip_client),
  KEY idx_noc_clients_status (status),
  KEY idx_noc_clients_zabbix (hostid_zabbix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- Incremental extensions for advanced client CRUD (safe to re-run)
-- -------------------------------------------------------------------------

ALTER TABLE noc_clients
  ADD COLUMN IF NOT EXISTS service_type ENUM('INTERNET', 'INTERCO', 'INTERNET_INTERCO', 'LIAISON') NOT NULL DEFAULT 'INTERNET',
  ADD COLUMN IF NOT EXISTS bandwidth_mbps DECIMAL(12, 2) NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT NULL;

CREATE TABLE IF NOT EXISTS noc_equipements (
  id_equipement BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NULL,
  equipement_code VARCHAR(80) NOT NULL,
  equipement_type ENUM('SWITCH', 'ROUTER', 'PC', 'FIREWALL', 'SERVER', 'OTHER', 'ONT', 'ONU', 'OLT', 'RADIO') NOT NULL,
  vendor VARCHAR(120) NULL,
  model VARCHAR(120) NULL,
  image_url VARCHAR(500) NULL,
  serial_number VARCHAR(120) NULL,
  ip_management VARCHAR(64) NULL,
  zabbix_hostid VARCHAR(64) NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  install_date DATE NULL,
  replace_due_date DATE NULL,
  estimated_service_life_months INT UNSIGNED NULL,
  status ENUM('UP', 'DOWN', 'MAINTENANCE') NOT NULL DEFAULT 'UP',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_equipement),
  UNIQUE KEY uk_noc_equipement_code (equipement_code),
  KEY idx_noc_equipement_client (client_id),
  CONSTRAINT fk_noc_equipement_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_cables (
  id_cable BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cable_code VARCHAR(80) NOT NULL,
  from_equipement_id BIGINT UNSIGNED NOT NULL,
  to_equipement_id BIGINT UNSIGNED NOT NULL,
  cable_type ENUM('FIBER_OPTIC', 'COAXIAL', 'JARETIERE', 'COPPER', 'OTHER') NOT NULL DEFAULT 'FIBER_OPTIC',
  dimension VARCHAR(120) NULL,
  attenuation_db DECIMAL(8, 3) NULL,
  length_m DECIMAL(12, 2) NULL,
  fiber_count INT NULL,
  status ENUM('UP', 'DOWN', 'MAINTENANCE') NOT NULL DEFAULT 'UP',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cable),
  UNIQUE KEY uk_noc_cable_code (cable_code),
  KEY idx_noc_cable_from_to (from_equipement_id, to_equipement_id),
  CONSTRAINT fk_noc_cable_from_equipement FOREIGN KEY (from_equipement_id) REFERENCES noc_equipements(id_equipement)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_noc_cable_to_equipement FOREIGN KEY (to_equipement_id) REFERENCES noc_equipements(id_equipement)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE noc_equipements
  MODIFY COLUMN equipement_type ENUM(
    'SWITCH',
    'ROUTER',
    'PC',
    'FIREWALL',
    'SERVER',
    'OTHER',
    'ONT',
    'ONU',
    'OLT',
    'RADIO'
  ) NOT NULL;

ALTER TABLE noc_cables
  MODIFY COLUMN cable_type ENUM('FIBER_OPTIC', 'COAXIAL', 'JARETIERE', 'COPPER', 'OTHER') NOT NULL DEFAULT 'FIBER_OPTIC';

CREATE TABLE IF NOT EXISTS noc_poteaux (
  id_poteau BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  poteau_code VARCHAR(80) NOT NULL,
  label VARCHAR(255) NOT NULL,
  address TEXT NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  status ENUM('UP', 'DOWN', 'MAINTENANCE') NOT NULL DEFAULT 'UP',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_poteau),
  UNIQUE KEY uk_noc_poteau_code (poteau_code),
  KEY idx_noc_poteau_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_contacts (
  id_contact BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role_label VARCHAR(120) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(191) NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_contact),
  KEY idx_noc_client_contact_client (client_id),
  CONSTRAINT fk_noc_client_contact_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_liaisons (
  id_liaison BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  liaison_label VARCHAR(255) NOT NULL,
  bandwidth_mbps DECIMAL(12, 2) NULL,
  service_type ENUM('INTERNET', 'INTERCO', 'INTERNET_INTERCO', 'LIAISON') NOT NULL DEFAULT 'LIAISON',
  status ENUM('UP', 'DOWN', 'DEGRADED', 'MAINTENANCE') NOT NULL DEFAULT 'UP',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_liaison),
  KEY idx_noc_liaison_client (client_id),
  CONSTRAINT fk_noc_liaison_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_documents (
  id_document BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  doc_type ENUM('ACCEPTANCE', 'CONTRACT', 'OTHER') NOT NULL DEFAULT 'OTHER',
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_document),
  KEY idx_noc_doc_client (client_id),
  CONSTRAINT fk_noc_doc_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_partners (
  id_partner BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_code VARCHAR(80) NOT NULL,
  partner_name VARCHAR(255) NOT NULL,
  contract_date DATE NULL,
  expiry_date DATE NULL,
  description TEXT NULL,
  operation_zones TEXT NULL,
  contact_email VARCHAR(191) NULL,
  contact_phone VARCHAR(50) NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_partner),
  UNIQUE KEY uk_noc_partner_code (partner_code),
  UNIQUE KEY uk_noc_partner_name (partner_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_partner_documents (
  id_doc BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id BIGINT UNSIGNED NOT NULL,
  doc_type ENUM('CONTRACT','AGREEMENT','OTHER') NOT NULL DEFAULT 'OTHER',
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_doc),
  KEY idx_noc_partner_doc_partner (partner_id),
  CONSTRAINT fk_noc_partner_doc_partner FOREIGN KEY (partner_id) REFERENCES noc_partners(id_partner)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_fai (
  id_fai BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fai_code VARCHAR(80) NOT NULL,
  fai_name VARCHAR(255) NOT NULL,
  address TEXT NULL,
  allocated_mbps DECIMAL(12,2) NULL,
  bandwidth_mbps DECIMAL(12,2) NULL,
  international_exit VARCHAR(255) NULL,
  link_type ENUM('FILAIRE','FAISCEAU_HERTZIEN','MIXTE') NULL,
  priority ENUM('PRINCIPALE','BACKUP','SECONDAIRE','TERTIAIRE') NULL DEFAULT 'PRINCIPALE',
  connectivity_type ENUM('DIRECT','DEDIE','POINT_TO_POINT','AUTRE') NULL DEFAULT 'DIRECT',
  contact_email VARCHAR(191) NULL,
  contact_phone VARCHAR(50) NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_fai),
  UNIQUE KEY uk_noc_fai_code (fai_code),
  UNIQUE KEY uk_noc_fai_name (fai_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_partner (
  client_id BIGINT UNSIGNED NOT NULL,
  partner_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (client_id, partner_id),
  CONSTRAINT fk_noc_client_partner_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_noc_client_partner_partner FOREIGN KEY (partner_id) REFERENCES noc_partners(id_partner)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_fai (
  client_id BIGINT UNSIGNED NOT NULL,
  fai_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (client_id, fai_id),
  CONSTRAINT fk_noc_client_fai_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_noc_client_fai_fai FOREIGN KEY (fai_id) REFERENCES noc_fai(id_fai)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

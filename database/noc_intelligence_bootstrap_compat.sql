-- NOC bootstrap schema (MySQL/MariaDB compatible)
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS only)

CREATE TABLE IF NOT EXISTS noc_clients (
  id_client BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_ref VARCHAR(80) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NULL,
  contact_email VARCHAR(191) NULL,
  address TEXT NULL,
  ip_client VARCHAR(64) NULL,
  hostid_zabbix VARCHAR(64) NULL,
  sla_target_percent DECIMAL(5,2) NOT NULL DEFAULT 99.90,
  service_type ENUM('INTERNET','INTERCO','INTERNET_INTERCO','LIAISON') NOT NULL DEFAULT 'INTERNET',
  bandwidth_mbps DECIMAL(12,2) NULL,
  notes TEXT NULL,
  status ENUM('ACTIVE','SUSPENDED','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_client),
  UNIQUE KEY uk_noc_clients_ref (client_ref),
  UNIQUE KEY uk_noc_clients_ip (ip_client),
  KEY idx_noc_clients_status (status),
  KEY idx_noc_clients_zabbix (hostid_zabbix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_contacts (
  id_contact BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(191) NOT NULL,
  role_label VARCHAR(120) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(191) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_contact),
  KEY idx_noc_client_contacts_client (client_id),
  CONSTRAINT fk_noc_client_contacts_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_liaisons (
  id_liaison BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  liaison_label VARCHAR(191) NOT NULL,
  bandwidth_mbps DECIMAL(12,2) NULL,
  service_type ENUM('INTERNET','INTERCO','INTERNET_INTERCO','LIAISON') NOT NULL DEFAULT 'INTERNET',
  status ENUM('UP','DOWN','DEGRADED','MAINTENANCE') NOT NULL DEFAULT 'UP',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_liaison),
  KEY idx_noc_client_liaisons_client (client_id),
  CONSTRAINT fk_noc_client_liaisons_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_documents (
  id_document BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  doc_type ENUM('ACCEPTANCE','CONTRACT','OTHER') NOT NULL DEFAULT 'OTHER',
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_document),
  KEY idx_noc_client_documents_client (client_id),
  CONSTRAINT fk_noc_client_documents_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_partners (
  id_partner BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_code VARCHAR(80) NOT NULL,
  partner_name VARCHAR(191) NOT NULL,
  contract_date DATE NULL,
  expiry_date DATE NULL,
  description TEXT NULL,
  operation_zones TEXT NULL,
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
  fai_name VARCHAR(191) NOT NULL,
  address TEXT NULL,
  allocated_mbps DECIMAL(12,2) NULL,
  bandwidth_mbps DECIMAL(12,2) NULL,
  international_exit VARCHAR(255) NULL,
  link_type ENUM('FILAIRE','FAISCEAU_HERTZIEN','MIXTE') NULL,
  priority ENUM('PRINCIPALE','BACKUP','SECONDAIRE','TERTIAIRE') NULL DEFAULT 'PRINCIPALE',
  connectivity_type ENUM('DIRECT','DEDIE','POINT_TO_POINT','AUTRE') NULL DEFAULT 'DIRECT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_fai),
  UNIQUE KEY uk_noc_fai_code (fai_code),
  UNIQUE KEY uk_noc_fai_name (fai_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_partner (
  client_id BIGINT UNSIGNED NOT NULL,
  partner_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id, partner_id),
  KEY idx_noc_client_partner_partner (partner_id),
  CONSTRAINT fk_noc_client_partner_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_noc_client_partner_partner FOREIGN KEY (partner_id) REFERENCES noc_partners(id_partner)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noc_client_fai (
  client_id BIGINT UNSIGNED NOT NULL,
  fai_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id, fai_id),
  KEY idx_noc_client_fai_fai (fai_id),
  CONSTRAINT fk_noc_client_fai_client FOREIGN KEY (client_id) REFERENCES noc_clients(id_client)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_noc_client_fai_fai FOREIGN KEY (fai_id) REFERENCES noc_fai(id_fai)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- ============================================================
-- Migration : noc_sites (création / mise à jour complète)
-- + table de liaison noc_site_equipements
-- ============================================================

-- 1. Créer la table noc_sites avec toutes les colonnes nécessaires
CREATE TABLE IF NOT EXISTS noc_sites (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_ref      VARCHAR(80)  NOT NULL,
  site_name     VARCHAR(200) NOT NULL,
  site_type_infra ENUM('PASSIF','ACTIF','PASSIF_ET_ACTIF') NOT NULL DEFAULT 'ACTIF',
  departement   VARCHAR(100) NOT NULL,
  arrondissement VARCHAR(150) NULL,
  quartier      VARCHAR(150) NULL,
  localite      VARCHAR(200) NULL,
  latitude      DECIMAL(10,7) NULL,
  longitude     DECIMAL(10,7) NULL,
  lieu_exact    TEXT NULL,
  responsible_name VARCHAR(200) NULL,
  responsible_phone VARCHAR(50) NULL,
  contact_email VARCHAR(200) NULL,
  contact_phone VARCHAR(50)  NULL,
  service_phone VARCHAR(50)  NULL,
  status        ENUM('ACTIVE','INACTIVE','MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
  description   TEXT NULL,
  infrastructure_notes TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_noc_site_ref (site_ref),
  KEY idx_noc_site_departement (departement),
  KEY idx_noc_site_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Ajouter les colonnes manquantes si la table existait déjà
--    (idempotent – ignore silencieusement si la colonne existe déjà)
SET @db = DATABASE();

-- site_type_infra
SET @col = 'site_type_infra';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN site_type_infra ENUM('PASSIF','ACTIF','PASSIF_ET_ACTIF') NOT NULL DEFAULT 'ACTIF' AFTER site_name",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- departement
SET @col = 'departement';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN departement VARCHAR(100) NOT NULL DEFAULT '' AFTER site_type_infra",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- arrondissement
SET @col = 'arrondissement';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN arrondissement VARCHAR(150) NULL AFTER departement",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- quartier
SET @col = 'quartier';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN quartier VARCHAR(150) NULL AFTER arrondissement",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- localite
SET @col = 'localite';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN localite VARCHAR(200) NULL AFTER quartier",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- latitude
SET @col = 'latitude';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN latitude DECIMAL(10,7) NULL AFTER localite",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- longitude
SET @col = 'longitude';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- lieu_exact
SET @col = 'lieu_exact';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN lieu_exact TEXT NULL AFTER longitude",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service_phone
SET @col = 'service_phone';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN service_phone VARCHAR(50) NULL AFTER contact_phone",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- responsible_name
SET @col = 'responsible_name';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN responsible_name VARCHAR(200) NULL AFTER lieu_exact",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- responsible_phone
SET @col = 'responsible_phone';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_sites' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_sites ADD COLUMN responsible_phone VARCHAR(50) NULL AFTER responsible_name",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Table de liaison site ↔ équipement
CREATE TABLE IF NOT EXISTS noc_site_equipements (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id         BIGINT UNSIGNED NOT NULL,
  equipement_id   BIGINT UNSIGNED NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_site_equipement (site_id, equipement_id),
  KEY idx_nse_site       (site_id),
  KEY idx_nse_equipement (equipement_id),
  CONSTRAINT fk_nse_site FOREIGN KEY (site_id)
    REFERENCES noc_sites(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_nse_equipement FOREIGN KEY (equipement_id)
    REFERENCES noc_equipements(id_equipement) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table des vigiles par site
CREATE TABLE IF NOT EXISTS noc_site_vigiles (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id         BIGINT UNSIGNED NOT NULL,
  first_name      VARCHAR(120) NOT NULL,
  last_name       VARCHAR(120) NOT NULL,
  personal_phone  VARCHAR(50) NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_nsv_site (site_id),
  KEY idx_nsv_name (last_name, first_name),
  CONSTRAINT fk_nsv_site FOREIGN KEY (site_id)
    REFERENCES noc_sites(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col = 'first_name';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_site_vigiles' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_site_vigiles ADD COLUMN first_name VARCHAR(120) NOT NULL DEFAULT '' AFTER site_id",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 'last_name';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_site_vigiles' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_site_vigiles ADD COLUMN last_name VARCHAR(120) NOT NULL DEFAULT '' AFTER first_name",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 'is_active';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'noc_site_vigiles' AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  "ALTER TABLE noc_site_vigiles ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER personal_phone",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Planning des agents de securite par site
CREATE TABLE IF NOT EXISTS noc_site_security_planning (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id           BIGINT UNSIGNED NOT NULL,
  vigile_id         BIGINT UNSIGNED NOT NULL,
  shift_start       DATETIME NOT NULL,
  shift_end         DATETIME NOT NULL,
  status            ENUM('PLANNED','ACTIVE','COMPLETED','ABSENT','REPLACED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  notes             TEXT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_nssp_site (site_id),
  KEY idx_nssp_vigile (vigile_id),
  KEY idx_nssp_start (shift_start),
  KEY idx_nssp_end (shift_end),
  CONSTRAINT fk_nssp_site FOREIGN KEY (site_id)
    REFERENCES noc_sites(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_nssp_vigile FOREIGN KEY (vigile_id)
    REFERENCES noc_site_vigiles(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

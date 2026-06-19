SET NAMES utf8mb4;
USE noc_activity;
SET @col_locality := (SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='noc_clients' AND COLUMN_NAME='locality' LIMIT 1);
SET @sql_add_locality := IF(@col_locality IS NULL, 'ALTER TABLE noc_clients ADD COLUMN locality VARCHAR(120) NULL AFTER address', 'SELECT 1');
PREPARE stmt FROM @sql_add_locality; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_libid := (SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='noc_clients' AND COLUMN_NAME='librenms_device_id' LIMIT 1);
SET @sql_add_libid := IF(@col_libid IS NULL, 'ALTER TABLE noc_clients ADD COLUMN librenms_device_id VARCHAR(64) NULL AFTER hostid_zabbix', 'SELECT 1');
PREPARE stmt FROM @sql_add_libid; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_libname := (SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='noc_clients' AND COLUMN_NAME='librenms_sysname' LIMIT 1);
SET @sql_add_libname := IF(@col_libname IS NULL, 'ALTER TABLE noc_clients ADD COLUMN librenms_sysname VARCHAR(255) NULL AFTER librenms_device_id', 'SELECT 1');
PREPARE stmt FROM @sql_add_libname; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @fk_users := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='mapping_zabbix' AND REFERENCED_TABLE_NAME='users' LIMIT 1);
SET @sql_drop_fk_users := IF(@fk_users IS NULL, 'SELECT 1', CONCAT('ALTER TABLE mapping_zabbix DROP FOREIGN KEY ', @fk_users, ''));
PREPARE stmt FROM @sql_drop_fk_users; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @uk_host := (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='mapping_zabbix' AND INDEX_NAME='uk_mapping_zabbix_host' LIMIT 1);
SET @sql_drop_uk_host := IF(@uk_host IS NULL, 'SELECT 1', 'ALTER TABLE mapping_zabbix DROP INDEX uk_mapping_zabbix_host');
PREPARE stmt FROM @sql_drop_uk_host; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @fk_noc := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='mapping_zabbix' AND REFERENCED_TABLE_NAME='noc_clients' LIMIT 1);
SET @sql_add_fk_noc := IF(@fk_noc IS NULL, 'ALTER TABLE mapping_zabbix ADD CONSTRAINT fk_mapping_zabbix_noc_clients FOREIGN KEY (id_client) REFERENCES noc_clients(client_ref) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql_add_fk_noc; EXECUTE stmt; DEALLOCATE PREPARE stmt;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0001', 'BEN''TSI', NULL, 'Brazzaville', '102.220.244.150', '141', '160', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.244.150' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '141', '102.220.244.150', 'BEN''TSI', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0002', 'OMS', NULL, 'Brazzaville', '192.168.99.12', '168', '44', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.12' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '192.168.99.12', 'OMS', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0003', 'CHAIRMAN', NULL, 'Brazzaville', '102.220.244.58', '141', '65', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.244.58' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '141', '102.220.244.58', 'CHAIRMAN', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0004', 'MFB - BZV', NULL, 'Brazzaville', '192.168.99.21', '112', '22', 'INTERNET_INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.21' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '112', '192.168.99.21', 'MFB - BZV', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0005', 'CI-GUSTA', NULL, 'Brazzaville', '102.220.244.122', '141', '92', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.244.122' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '141', '102.220.244.122', 'CI-GUSTA', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0006', 'ECOBANK DG', NULL, 'Brazzaville', '192.168.99.17', '186', '60', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.17' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '186', '192.168.99.17', 'ECOBANK DG', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0007', 'NEW-PARLEMENT', NULL, 'Brazzaville', '102.220.244.118', '157', '5', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.244.118' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '157', '102.220.244.118', 'NEW-PARLEMENT', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0008', 'SNPC BZV', NULL, 'Brazzaville', '192.168.99.13', '177', '25', 'INTERNET_INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.13' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '177', '192.168.99.13', 'SNPC BZV', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0009', 'AERCO - BZV', NULL, 'Brazzaville', '192.168.99.11', '213', '101', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.11' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '213', '192.168.99.11', 'AERCO - BZV', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0010', 'ACSI - BZV', NULL, 'Brazzaville', '192.168.99.22', '186', '53', 'INTERNET_INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.22' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '186', '192.168.99.22', 'ACSI - BZV', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0011', 'Appo BZV', NULL, 'Brazzaville', '102.220.244.170', '129', '51', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.244.170' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '129', '102.220.244.170', 'Appo BZV', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0012', 'UBA DG', NULL, 'Brazzaville', '192.168.99.36', '132', '46', 'INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.36' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '132', '192.168.99.36', 'UBA DG', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0013', 'PNUD', NULL, 'Brazzaville', '192.168.99.23', '177', '68', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.23' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '177', '192.168.99.23', 'PNUD', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0014', 'COORDINATION PNUD', NULL, 'Brazzaville', '102.220.244.226', '132', '67', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.244.226' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '132', '102.220.244.226', 'COORDINATION PNUD', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0015', 'GUOT', NULL, 'Brazzaville', '192.168.99.53', '168', '72', 'INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.53' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '192.168.99.53', 'GUOT', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0016', 'UNICEF BZV', NULL, 'Brazzaville', '192.168.99.26', '186', '85', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.26' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '186', '192.168.99.26', 'UNICEF BZV', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0017', 'AISB', NULL, 'Brazzaville', '192.168.99.77', '168', '142', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.77' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '192.168.99.77', 'AISB', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0018', 'SERFIN', NULL, 'Brazzaville', '102.220.244.242', '141', '88', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.244.242' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '141', '102.220.244.242', 'SERFIN', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0019', 'REP OMS', NULL, 'Brazzaville', '192.168.99.29', '168', '97', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.29' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '192.168.99.29', 'REP OMS', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0020', 'UNFPA OFFICE', NULL, 'Brazzaville', '192.168.99.30', '186', '98', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.30' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '186', '192.168.99.30', 'UNFPA OFFICE', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0021', 'PAM', NULL, 'Brazzaville', '192.168.99.35', '174', '109', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.35' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '174', '192.168.99.35', 'PAM', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0022', 'PAM-ENTREPOT', NULL, 'Brazzaville', '192.168.99.28', '165', '110', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.28' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '165', '192.168.99.28', 'PAM-ENTREPOT', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0023', 'REP-UNICEF', NULL, 'Brazzaville', '192.168.99.31', '25', '112', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.31' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '25', '192.168.99.31', 'REP-UNICEF', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0024', 'PODI', NULL, 'Brazzaville', '102.220.244.102', '96', '236', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.244.102' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '96', '102.220.244.102', 'PODI', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0025', 'FSIE', NULL, 'Brazzaville', '102.220.244.54', '141', '115', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.244.54' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '141', '102.220.244.54', 'FSIE', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0026', '3C-TECH SIEGE BPC', NULL, 'Brazzaville', '192.168.99.78', '174', '141', 'INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.78' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '174', '192.168.99.78', '3C-TECH SIEGE BPC', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0027', 'RÃ©sidence VIP', NULL, 'Brazzaville', '102.220.245.38', '96', '121', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.245.38' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '96', '102.220.245.38', 'RÃ©sidence VIP', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0028', 'SECURIPORT', NULL, 'Brazzaville', '192.168.99.38', '123', '229', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.38' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '123', '192.168.99.38', 'SECURIPORT', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0029', 'BSCA POTO POTO', NULL, 'Brazzaville', '102.220.245.17', '96', '128', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.245.17' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '96', '102.220.245.17', 'BSCA POTO POTO', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0030', 'ECAIR SIEGE', NULL, 'Brazzaville', '192.168.99.42', '168', '134', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.42' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '192.168.99.42', 'ECAIR SIEGE', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0031', 'AGC-KOMBO', NULL, 'Brazzaville', '102.220.245.46', NULL, '140', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.245.46' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0032', 'UNESCO', NULL, 'Brazzaville', '192.168.99.106', '123', '157', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.106' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '123', '192.168.99.106', 'UNESCO', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0033', 'AIR-COTE-DIVOIRE', NULL, 'Brazzaville', '192.168.99.107', NULL, '180', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.107' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0034', 'MISTRAL', NULL, 'Brazzaville', '192.168.99.109', '168', '219', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.109' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '192.168.99.109', 'MISTRAL', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0035', 'SCLOG', NULL, 'Brazzaville', '192.168.99.108', '123', '208', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.108' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '123', '192.168.99.108', 'SCLOG', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0036', 'KEMPINSKI', NULL, 'Brazzaville', '192.168.99.24', NULL, '192', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.24' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0037', 'ACONOQ', NULL, 'Brazzaville', '102.220.245.186', '96', '224', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.245.186' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '96', '102.220.245.186', 'ACONOQ', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0038', 'PATN - UMNG', NULL, 'Brazzaville', '192.168.99.100', NULL, NULL, 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.100' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0039', 'PATN - HOPITAL TALANGAI', NULL, 'Brazzaville', '10.80.10.10', '168', '175', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '10.80.10.10' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '10.80.10.10', 'PATN - HOPITAL TALANGAI', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0040', 'PATN - CHU', NULL, 'Brazzaville', '10.80.10.12', '168', '168', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '10.80.10.12' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '10.80.10.12', 'PATN - CHU', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0041', 'PATN - MORGUE', NULL, 'Brazzaville', '10.80.10.14', '168', '167', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '10.80.10.14' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '10.80.10.14', 'PATN - MORGUE', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0042', 'PATN - MAIRIE DE OUENZE', NULL, 'Brazzaville', '10.80.10.2', NULL, '185', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '10.80.10.2' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0043', 'CAFI', NULL, 'Brazzaville', '102.220.245.54', NULL, '191', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.245.54' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0044', 'MFB PNR', NULL, 'Pointe-Noire', '192.168.99.136', '186', '21', 'INTERNET_INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.136' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '186', '192.168.99.136', 'MFB PNR', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0045', 'CONGOBET POINTE NOIRE', NULL, 'Pointe-Noire', '102.220.246.106', '141', '54', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '102.220.246.106' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '141', '102.220.246.106', 'CONGOBET POINTE NOIRE', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0046', 'SNPC COMILOG', NULL, 'Pointe-Noire', '192.168.99.143', '168', '91', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.143' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '192.168.99.143', 'SNPC COMILOG', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0047', 'AERCO OFFICE POINTE NOIRE', NULL, 'Pointe-Noire', '192.168.99.133', '195', '37', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.133' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '195', '192.168.99.133', 'AERCO OFFICE POINTE NOIRE', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0048', 'ACSI POINTE NOIRE', NULL, 'Pointe-Noire', '192.168.99.132', '186', '94', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.132' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '186', '192.168.99.132', 'ACSI POINTE NOIRE', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0049', 'UNICEF PNR', NULL, 'Pointe-Noire', '192.168.99.142', '168', '93', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.142' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '192.168.99.142', 'UNICEF PNR', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0050', 'GUOT', NULL, 'Pointe-Noire', '192.168.99.141', '168', '92', 'INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.141' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '168', '192.168.99.141', 'GUOT', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0051', 'SECURIPORT', NULL, 'Pointe-Noire', '192.168.99.146', '123', '143', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.146' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '123', '192.168.99.146', 'SECURIPORT', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0052', 'AGL', NULL, 'Pointe-Noire', '192.168.99.150', '186', '135', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.150' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '186', '192.168.99.150', 'AGL', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0053', 'CORAF', NULL, 'Pointe-Noire', '192.168.99.157', '186', '166', 'INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.157' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '186', '192.168.99.157', 'CORAF', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0054', 'CCC', NULL, 'Pointe-Noire', '192.168.99.155', '123', '171', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.155' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '123', '192.168.99.155', 'CCC', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0055', 'TRIDENT', NULL, 'Pointe-Noire', '192.168.99.241', '165', '214', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.241' LIMIT 1);
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '165', '192.168.99.241', 'TRIDENT', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0056', 'AIR COTE D''IVOIRE', NULL, 'Pointe-Noire', '192.168.99.239', NULL, '181', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.239' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0057', 'PIC A RISE', NULL, 'Pointe-Noire', '192.168.99.238', NULL, '213', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.238' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0058', 'PERENCO', NULL, 'Pointe-Noire', '192.168.99.237', NULL, '203', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.237' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0059', 'ZES', NULL, 'Pointe-Noire', '192.168.99.235', NULL, '210', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.235' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0060', 'BSCA ATLANTIC', NULL, 'Pointe-Noire', '192.168.99.161', NULL, '188', 'INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.161' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0061', 'BSCA PLAGE', NULL, 'Pointe-Noire', '192.168.99.240', NULL, '189', 'INTERCO', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.240' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('CLISC_IMPORT_20260611_0062', 'ARCHER CAPITAL', NULL, 'Pointe-Noire', '192.168.99.244', NULL, '228', 'INTERNET', 'ACTIVE', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '192.168.99.244' LIMIT 1);
DELETE FROM mapping_zabbix WHERE id_client = @client_ref;

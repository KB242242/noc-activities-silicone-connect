-- Migration: Add LibreNMS device reference fields to noc_clients
-- Run this once on your database to enable LibreNMS device linking per client.
-- Safe to run multiple times (uses IF NOT EXISTS / IGNORE patterns).

-- Add librenms_device_id column (numeric ID from LibreNMS)
ALTER TABLE noc_clients
  ADD COLUMN IF NOT EXISTS librenms_device_id INT UNSIGNED NULL DEFAULT NULL COMMENT 'LibreNMS device_id (numeric, visible in URL /device/device=ID/)' AFTER hostid_zabbix;

-- Add librenms_sysname column (SNMP System Name from LibreNMS)
ALTER TABLE noc_clients
  ADD COLUMN IF NOT EXISTS librenms_sysname VARCHAR(255) NULL DEFAULT NULL COMMENT 'LibreNMS SNMP sysname (System Name field in device overview)' AFTER librenms_device_id;

-- Optional index to speed up sysname lookups
CREATE INDEX IF NOT EXISTS idx_noc_clients_librenms_device ON noc_clients (librenms_device_id);
CREATE INDEX IF NOT EXISTS idx_noc_clients_librenms_sysname ON noc_clients (librenms_sysname(100));
